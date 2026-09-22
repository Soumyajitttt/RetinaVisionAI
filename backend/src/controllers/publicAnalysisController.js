// Standalone "image in, JSON out" endpoint. No patientId, no DB lookup.
// Reuses your existing runMatlabPipeline.js as-is. Good for letting another
// team (frontend, or a friend's project) integrate directly against the
// MATLAB pipeline for testing.

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { runMatlabPipeline } = require("../utils/runMatlabPipeline");
const { labelForGrade } = require("../utils/gradeLabels");
const asyncHandler = require("../utils/asyncHandler");
const { uploadToCloud, cleanupJobDir, isCloudEnabled } = require("../utils/cloudStorage");

// POST /api/analyze  (multipart/form-data, field name "image")
const analyzePublic = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded (field name must be 'image')" });
  }

  const imagePath = req.file.path;

  // Each request gets its own output folder under uploads/jobs/<jobId>.
  // Note this is a *second* folder: multer (middlewares/upload.js) already
  // made uploads/<req.jobId>/ for the source image. Both get cleaned up
  // below, otherwise each call would leak two folders instead of one.
  const jobId = uuidv4();
  const jobDir = path.join(__dirname, "..", "uploads", "jobs", jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  try {
    const raw = await runMatlabPipeline(imagePath, jobDir);

    const result = {
      jobId,
      ...raw,
      gradeText: raw.grade != null ? labelForGrade(raw.grade) : "Awaiting analysis"
    };

    // Same cloud-first, local-fallback strategy as analysisController.
    let allUploaded = true;
    for (const [fname, key] of [
      ["gradcam.png", "gradcam_url"],
      ["enhanced.png", "enhanced_url"]
    ]) {
      const filePath = path.join(jobDir, fname);
      if (fs.existsSync(filePath)) {
        const cloudUrl = await uploadToCloud(filePath, jobId);
        if (cloudUrl) {
          result[key] = cloudUrl;
        } else {
          result[key] = `/uploads/jobs/${jobId}/${fname}`;
          allUploaded = false;
        }
      }
    }

    res.json(result);

    if (isCloudEnabled() && allUploaded) {
      cleanupJobDir(jobDir);
      cleanupJobDir(req.jobDir);
    }
  } catch (err) {
    // The pipeline failed, so nothing here is worth keeping either way.
    cleanupJobDir(jobDir);
    cleanupJobDir(req.jobDir);
    res.status(500).json({ error: err.message || "MATLAB pipeline failed" });
  }
});

module.exports = { analyzePublic };