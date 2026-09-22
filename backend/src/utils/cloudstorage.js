const fs = require("fs");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
const config = require("../config/env");

let configured = false;

function ensureConfigured() {
  if (configured) return true;

  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
  configured = true;
  return true;
}

// Cloudinary's free plan rejects any single image over 10MB. MATLAB's
// enhanced.png / gradcam.png come out as large, lightly-compressed PNGs
// (10MB+ isn't unusual at full resolution), so every upload was failing
// silently and falling back to local disk. Fix: shrink + re-encode as JPEG
// before uploading - these are display/preview images (used in the
// Results tab and PDF report), not a clinical archival copy, so a
// resize + quality-85 JPEG is more than good enough visually.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 85;

async function compressForUpload(localPath) {
  return sharp(localPath)
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

/**
 * Uploads a MATLAB-generated image (enhanced.png / gradcam.png) to
 * Cloudinary and returns its public HTTPS URL. Compresses/resizes first
 * so large MATLAB output doesn't exceed Cloudinary's per-file limit.
 *
 * Returns null if Cloudinary isn't configured or the upload fails - the
 * caller then falls back to the local `/uploads/...` path, so a missing
 * or misconfigured Cloudinary account degrades to the old behaviour
 * instead of breaking analysis entirely.
 */
async function uploadToCloud(localPath, jobId) {
  if (!ensureConfigured()) {
    console.warn(
      "[cloudStorage] CLOUDINARY_* not set in .env - keeping images on local disk. " +
        "The uploads/ folder will keep growing until this is configured."
    );
    return null;
  }

  try {
    const buffer = await compressForUpload(localPath);

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `dr-screening/${jobId}`,
          resource_type: "image",
          format: "jpg"
        },
        (err, res) => (err ? reject(err) : resolve(res))
      );
      stream.end(buffer);
    });

    console.log(`[cloudStorage] Uploaded ${localPath} -> ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    console.error(
      `[cloudStorage] Upload failed for ${localPath}:`,
      err.message,
      err.http_code ? `(HTTP ${err.http_code})` : ""
    );
    return null;
  }
}

/**
 * Deletes a local job folder (original upload + MATLAB output) once its
 * images are safely in the cloud. Non-throwing and fire-and-forget: a
 * failed cleanup should never break an otherwise-successful analysis
 * response.
 */
function cleanupJobDir(jobDir) {
  if (!jobDir) return;
  fs.rm(jobDir, { recursive: true, force: true }, (err) => {
    if (err) console.error(`[cloudStorage] Failed to clean up ${jobDir}:`, err.message);
  });
}

/**
 * True when Cloudinary is usable. Callers check this before deleting a
 * job folder: if images are still only on local disk, deleting the folder
 * would leave the saved URLs pointing at files that no longer exist.
 */
function isCloudEnabled() {
  return ensureConfigured();
}

module.exports = { uploadToCloud, cleanupJobDir, isCloudEnabled };