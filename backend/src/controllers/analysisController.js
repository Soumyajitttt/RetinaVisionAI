const path = require("path");
const fs = require("fs");
const AnalysisResult = require("../models/AnalysisResult");
const Patient = require("../models/Patient");
const { labelForGrade } = require("../utils/gradeLabels");
const { runMatlabPipeline } = require("../utils/runMatlabPipeline");
const asyncHandler = require("../utils/asyncHandler");
const { quickFundusCheck } = require("../utils/quickFundusCheck");
const { uploadToCloud, cleanupJobDir, isCloudEnabled } = require("../utils/cloudstorage");

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
          lesionOverlap: "",
          maCount: "",
          hemCount: "",
          exudateCount: "",
          enhanced_url: "",
          gradcam_url: "",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Rejected images are never shown anywhere, so nothing in this job
    // folder is worth keeping - multer already wrote the upload to disk
    // before quickFundusCheck ran. Without this, every junk upload would
    // permanently leak a folder.
    cleanupJobDir(jobDir);

    return res.json(saved);
  }

  const raw = await runMatlabPipeline(imagePath, jobDir);

  // A pipeline-level failure (e.g. runPipelineForWeb.m couldn't load
  // models/drNet.mat) is reported as status "error" + errorMessage in
  // result.json rather than MATLAB crashing the whole process - see the
  // try/catch around Module 3/4 in runPipelineForWeb.m. Surface that
  // clearly and stop here rather than falling through to the upload loop
  // below, which has nothing to upload for a run that never classified.
  if (raw.status === "error") {
    const saved = await AnalysisResult.findOneAndUpdate(
      { patientId },
      {
        $set: {
          patientId,
          status: "error",
          errorMessage: raw.errorMessage || "Analysis pipeline failed.",
        },
        // Segmentation counts (maCount/hemCount/exudateCount) may have
        // completed fine before classification failed, so those are left
        // alone - only the classification-derived fields are cleared, so
        // a stale grade/confidence from a previous successful run can
        // never be shown alongside this error.
        $unset: {
          grade: "",
          gradeText: "",
          confidence: "",
          lesionOverlap: "",
          gradcam_url: "",
          multilayer_url: "",
          crossmethod_url: "",
          activations_url: "",
          rejectReason: "",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    cleanupJobDir(jobDir);
    return res.json(saved);
  }

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

  // Push MATLAB's output images to Cloudinary and store the public URL,
  // so the local copy becomes disposable. Falls back to the old local
  // `/uploads/...` path when Cloudinary isn't configured.
  //
  // IMPORTANT: this always runs for every image that exists on disk - it
  // does NOT check "does resultDoc[key] already have a value" first.
  // MATLAB's result.json (spread into resultDoc via `...raw` above)
  // ALWAYS already contains a local-path gradcam_url/enhanced_url of its
  // own, since runPipelineForWeb.m has no concept of Cloudinary and just
  // writes where it saved the file on disk. A "skip if already set" guard
  // here means "skip forever" for every real MATLAB run - which is
  // exactly why uploads were silently never happening. MATLAB's local
  // path is only ever a starting point to overwrite, never a finished
  // answer.
  let allUploaded = true;
  for (const [fname, key] of [
    ["gradcam.png", "gradcam_url"],
    ["enhanced.png", "enhanced_url"],
    // Written by generateMultiLayerCAM.m / generateCrossMethodCAM.m /
    // generateActivationsPanel.m (see src/explainability) when
    // runPipelineForWeb.m calls them. Same jobDir, same per-upload
    // lifecycle as gradcam.png/enhanced.png above - if a given file isn't
    // there (older MATLAB project not yet wired up, or this particular
    // run skipped it), `fs.existsSync` below just skips it and the
    // corresponding *_url stays null. Nothing about the existing
    // gradcam/enhanced flow changes.
    ["multilayer.png", "multilayer_url"],
    ["crossmethod.png", "crossmethod_url"],
    ["activations.png", "activations_url"],
  ]) {
    const filePath = path.join(jobDir, fname);
    if (!fs.existsSync(filePath)) continue;

    const cloudUrl = await uploadToCloud(filePath, jobId);
    if (cloudUrl) {
      resultDoc[key] = cloudUrl;
    } else {
      resultDoc[key] = `/uploads/${jobId}/${fname}`;
      allUploaded = false;
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

  // Only safe to delete once everything the saved document points at
  // actually lives in the cloud. If any upload fell back to a local path,
  // deleting the folder would leave the frontend with broken images.
  if (isCloudEnabled() && allUploaded) {
    cleanupJobDir(jobDir);
  }

  res.json(saved);
});

module.exports = { getAnalysisForPatient, uploadAndAnalyze };