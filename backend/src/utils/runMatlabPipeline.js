const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const config = require("../config/env");

/**
 * Runs the MATLAB DR-screening pipeline on an uploaded image, mirroring what
 * webapp/app.py does in the Python/Flask backend (see runPipelineForWeb.m).
 *
 * If MATLAB_EXE / MATLAB_PROJECT_ROOT aren't configured (e.g. during frontend
 * development, or before MATLAB is installed), this falls back to a mock
 * result so the rest of the app keeps working end-to-end.
 *
 * @param {string} imagePath - absolute path to the uploaded image
 * @param {string} jobDir - absolute path to the per-job output directory
 * @returns {Promise<object>} parsed result.json contents
 */
function runMatlabPipeline(imagePath, jobDir) {
  const { exePath, projectRoot, timeoutMs } = config.matlab;

  if (!exePath || !projectRoot) {
    console.warn(
      "[runMatlabPipeline] MATLAB_EXE / MATLAB_PROJECT_ROOT not set - returning mock result. " +
        "Set these in .env once MATLAB is installed and configured."
    );
    return Promise.resolve(mockResult());
  }

  const srcDir = path.join(projectRoot, "src");
  const subfolders = ["quality", "segmentation", "explainability"];
  const addPaths = subfolders.map((s) => `addpath('${path.join(srcDir, s)}')`).join("; ");

  const matlabExpr =
    `cd('${projectRoot}'); ${addPaths}; addpath('${projectRoot}'); ` +
    `runPipelineForWeb('${imagePath}', '${jobDir}')`;

  return new Promise((resolve, reject) => {
    execFile(exePath, ["-batch", matlabExpr], { timeout: timeoutMs }, (error, stdout, stderr) => {
      // IMPORTANT: this used to only surface stdout/stderr when MATLAB
      // exited non-zero. But runPipelineForWeb.m's explainability calls
      // are individually wrapped in try/catch + warning() precisely so a
      // failure there DOESN'T make MATLAB exit non-zero - the whole
      // process still succeeds with a valid result.json, just missing
      // multilayer.png/crossmethod.png/activations.png. Which meant those
      // warning() messages - the only clue as to *why* - were being
      // silently discarded on every successful run. Always log a
      // truncated view of both streams now, regardless of outcome.
      const preview = (s, label) => {
        if (!s || !s.trim()) return;
        const trimmed = s.trim();
        console.log(`[runMatlabPipeline] MATLAB ${label}:\n${trimmed.slice(0, 4000)}`);
      };
      preview(stdout, "stdout");
      preview(stderr, "stderr");

      if (error) {
        if (error.code === "ENOENT") {
          return reject(
            new Error(`'${exePath}' not found - is MATLAB desktop installed and on PATH?`)
          );
        }
        if (error.killed) {
          return reject(
            new Error(
              `MATLAB timed out after ${Math.round(timeoutMs / 1000)}s. If this keeps happening, ` +
                "raise MATLAB_TIMEOUT_MS in backend/.env (the explainability views - especially " +
                "Cross-Method/LIME - add real processing time per upload)."
            )
          );
        }
        return reject(new Error(stderr?.trim() || stdout?.trim() || "MATLAB processing failed"));
      }

      const resultPath = path.join(jobDir, "result.json");
      if (!fs.existsSync(resultPath)) {
        return reject(new Error("No result.json produced - check MATLAB output for errors"));
      }

      try {
        const result = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
        resolve(result);
      } catch (parseErr) {
        reject(new Error("Failed to parse result.json from MATLAB pipeline"));
      }
    });
  });
}

function mockResult() {
  return {
    status: "enhanced",
    score: 3,
    grade: 2,
    confidence: 0.91,
    lesionOverlap: 0.826,
    maCount: 6,
    hemCount: 2,
    exudateCount: 1
  };
}

module.exports = { runMatlabPipeline };