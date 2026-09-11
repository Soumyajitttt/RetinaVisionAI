const path = require("path");
const fs = require("fs");
const AnalysisResult = require("../models/AnalysisResult");
const Patient = require("../models/Patient");
const { labelForGrade } = require("../utils/gradeLabels");
const { runMatlabPipeline } = require("../utils/runMatlabPipeline");
const asyncHandler = require("../utils/asyncHandler");
const { quickFundusCheck } = require("../utils/quickFundusCheck");

// GET /api/analysis/:patientId
const getAnalysisForPatient = asyncHandler(async (req, res) => {
  const result = await AnalysisResult.findOne({
    patientId: req.params.patientId,
  });
  if (!result) {
    return res
      .status(404)
      .json({ error: `No analysis found for patient ${req.params.patientId}` });
  }
  res.json(result);
});

// POST /api/analysis/:patientId/upload  (multipart/form-data, field name "image")
// Mirrors the Flask /analyze endpoint: saves the upload, runs the MATLAB
// pipeline (or falls back to a mock result), stores + returns the result.
const uploadAndAnalyze = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  const patient = await Patient.findOne({ patientId });
  if (!patient) {
    return res.status(404).json({ error: `Patient ${patientId} not found` });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  const imagePath = req.file.path;
  const jobDir = req.jobDir;
  const jobId = req.jobId;

  const check = await quickFundusCheck(imagePath);
  if (!check.isFundus) {
    const saved = await AnalysisResult.findOneAndUpdate(
      { patientId },
      {
        $set: {
          patientId,
          status: "reject",
          score: 0,
          rejectReason: check.reason || null,
        },
        // ...AND clear out any stale fields from a previous successful run,
        // otherwise old grade/confidence/lesion counts linger in the
        // document and the frontend can end up showing "Grade 3: Severe
        // DR, 99.2% confidence" for an image that was actually rejected.
        $unset: {
          grade: "",
          gradeText: "",
          confidence: "",
          maCount: "",
          hemCount: "",
          exudateCount: "",
          enhanced_url: "",
          gradcam_url: "",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.json(saved);
  }

  const raw = await runMatlabPipeline(imagePath, jobDir);

  const resultDoc = {
    ...raw,
    // Always force a valid status on a successful run. Don't rely on raw
    // (MATLAB's result.json) to always include a status field — if it's
    // missing for any reason, the *previous* saved status (e.g. "reject"
    // from an earlier non-fundus upload) would otherwise linger forever,
    // since findOneAndUpdate only touches fields you explicitly give it.
    status: raw.status || "pass",
    gradeText:
      raw.grade != null ? labelForGrade(raw.grade) : "Awaiting analysis",
  };

  for (const [fname, key] of [
    ["gradcam.png", "gradcam_url"],
    ["enhanced.png", "enhanced_url"],
  ]) {
    if (!resultDoc[key]) {
      const filePath = path.join(jobDir, fname);
      try {
        fs.accessSync(filePath);
        resultDoc[key] = `/uploads/${jobId}/${fname}`;
      } catch {
        // file doesn't exist, leave as-is
      }
    }
  }

  const saved = await AnalysisResult.findOneAndUpdate(
    { patientId },
    {
      $set: { patientId, ...resultDoc },
      // Clear the reject-specific field from any earlier rejected upload
      // for this same patient, so it never lingers into a real result.
      $unset: { rejectReason: "" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.json(saved);
});

module.exports = { getAnalysisForPatient, uploadAndAnalyze };
