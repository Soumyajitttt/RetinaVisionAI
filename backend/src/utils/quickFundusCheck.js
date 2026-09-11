const sharp = require("sharp");

/**
 * Fast pre-check (~100-300ms) mirroring "not a fundus photo" heuristics.
 * This does NOT replace the full MATLAB quality assessment — anything that
 * passes this still goes through assessQuality.m for the complete checks.
 *
 * NOTE on hue-uniformity check (removed):
 * An earlier version added a Check 3 that rejected images with high hue
 * variance, based on the idea that fundus photos are near-monochromatic
 * red-orange. Testing showed this incorrectly rejects real DR-positive
 * fundus images — hemorrhages, exudates, and other lesions introduce
 * enough hue variation (observed up to ~8° std) to overlap with non-fundus
 * photos (~8.6° std in testing), making it an unreliable discriminator.
 * Removed to avoid false-rejecting the exact images this tool needs to
 * detect. If reintroduced, it would need a much larger, more careful
 * test set across DR severity grades before trusting any threshold.
 */
async function quickFundusCheck(imagePath) {
  const size = 100;
  const { data, info } = await sharp(imagePath)
    .resize(size, size, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const cornerSize = Math.round(size * 0.08);

  function pixelAt(x, y) {
    const idx = (y * size + x) * channels;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
  }
  function grayAt(x, y) {
    const { r, g, b } = pixelAt(x, y);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Check 1: dark corners (fundus photos have a black vignette border)
  let cornerSum = 0,
    cornerCount = 0;
  const corners = [
    [0, 0],
    [size - cornerSize, 0],
    [0, size - cornerSize],
    [size - cornerSize, size - cornerSize],
  ];
  for (const [cx, cy] of corners) {
    for (let x = cx; x < cx + cornerSize; x++) {
      for (let y = cy; y < cy + cornerSize; y++) {
        cornerSum += grayAt(x, y);
        cornerCount++;
      }
    }
  }
  if (cornerSum / cornerCount > 30) {
    return { isFundus: false, reason: "no dark border detected" };
  }

  // Check 2: red/orange dominance within the field of view.
  // Threshold tuned from real samples: fake/non-fundus photos measured
  // ~1.3-1.5, genuine fundus photos measured 2.98-15.47. 2.0 sits safely
  // in the gap.
  let sumR = 0,
    sumB = 0,
    fovCount = 0;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (grayAt(x, y) > 10) {
        const { r, b } = pixelAt(x, y);
        sumR += r;
        sumB += b;
        fovCount++;
      }
    }
  }
  const meanR = fovCount ? sumR / fovCount : 0;
  const meanB = fovCount ? sumB / fovCount : 0;
  if (meanB === 0 || meanR / (meanB + 1e-6) < 2.0) {
    return { isFundus: false, reason: "not red/orange-dominant" };
  }

  return { isFundus: true };
}

module.exports = { quickFundusCheck };
