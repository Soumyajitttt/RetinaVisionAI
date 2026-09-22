const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");

// Same upload root as src/middlewares/upload.js, so AnalysisResult's
// "/uploads/<jobId>/xxx.png" URLs can be resolved back to a real file
// on disk for embedding in the PDF.
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

// Same ICDR-based grade notes shown on the frontend's PdfReportPage, kept
// in sync here so the emailed PDF explains the grade, not just the number.
const GRADE_NOTES = {
  0: "No signs of diabetic retinopathy detected. Continue routine annual screening.",
  1: "Mild NPDR - a small number of microaneurysms are visible, usually the earliest detectable sign. Recommend re-screening within 12 months.",
  2: "Moderate NPDR - more numerous microaneurysms and small hemorrhages, not yet at severe-stage levels. Recommend follow-up within 6-12 months.",
  3: "Severe NPDR - extensive hemorrhages and microaneurysms across all quadrants, a strong signal of imminent progression. Recommend urgent referral within 2 weeks.",
  4: "Proliferative DR - abnormal new blood vessel growth and/or vitreous hemorrhage; the most advanced, vision-threatening stage. Recommend immediate referral for treatment."
};

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode >= 400) {
          res.resume();
          return reject(new Error(`Failed to fetch image (${res.statusCode}): ${url}`));
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

// Resolves an AnalysisResult image field into something pdfkit's
// doc.image() can draw directly. Two cases, both real:
//  - a Cloudinary https:// URL (the normal case now that uploads work) -
//    fetched into a Buffer, since doc.image() can't take a remote URL
//  - a legacy local "/uploads/<jobId>/xxx.png" path (from before
//    Cloudinary was configured, or a run where the upload fell back) -
//    resolved to an absolute path on disk, as before
// Returns null if neither is reachable, so the PDF just omits that one
// image instead of throwing and failing the whole referral email.
async function resolveImageSource(url) {
  if (!url) return null;

  if (/^https?:\/\//i.test(url)) {
    try {
      return await fetchBuffer(url);
    } catch (err) {
      console.error(`[generateReportPdf] Failed to fetch ${url}:`, err.message);
      return null;
    }
  }

  const rel = url.replace(/^\/?uploads\//, "");
  const abs = path.join(UPLOAD_ROOT, rel);
  return fs.existsSync(abs) ? abs : null;
}

// Renders the same report shown on the frontend's Report Preview page as a
// PDF, server-side, so it can be attached to the referral email. Returns a
// Promise<Buffer> (no temp file needed).
async function generateReportPdfBuffer({ patient, analysis, specialist }) {
  // Resolved BEFORE opening the PDFDocument - a Cloudinary fetch is async,
  // and pdfkit's own writing below is a synchronous stream of doc calls,
  // so both images need to already be in hand (Buffer or path) by the
  // time doc.image() is called.
  const [enhancedSource, gradcamSource] = await Promise.all([
    resolveImageSource(analysis.enhanced_url),
    resolveImageSource(analysis.gradcam_url)
  ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).fillColor("#010110").text("PRIMARY HEALTH CENTRE TELE-RETINA REPORT");
    doc.fontSize(10).fillColor("#45545e").text("Diabetic Retinopathy Screening Network - India");

    const reportId = `R-${Math.floor(Math.random() * 900000 + 100000)}`;
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    doc.moveUp(2).fontSize(10).fillColor("#45545e").text(`Report ID: ${reportId}`, { align: "right" });
    doc.text(`Date: ${dateStr}`, { align: "right" });

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#dddddd").stroke();
    doc.moveDown(1);

    doc.fontSize(11).fillColor("#242424");
    doc.text(`Patient Name: ${patient.name}`);
    doc.text(`Patient ID: ${patient.patientId}`);
    doc.text(`Age / Gender: ${patient.age} Yrs / ${patient.gender}`);
    doc.text(`Location: ${patient.village || "N/A"}`);

    doc.moveDown(1);
    doc.fontSize(13).fillColor("#010110").text("Automated Diagnostic Findings");
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#242424").text(`Grading Result: ${analysis.gradeText || "N/A"}`);

    if (analysis.grade != null && GRADE_NOTES[analysis.grade]) {
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor("#45545e").font("Helvetica-Oblique").text(GRADE_NOTES[analysis.grade]);
      doc.font("Helvetica");
    }

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#242424");
    doc.text(`Microaneurysms: ${analysis.maCount ?? "N/A"}`);
    doc.text(`Intraretinal Hemorrhages: ${analysis.hemCount ?? "N/A"}`);
    doc.text(`Hard Exudates: ${analysis.exudateCount ?? "N/A"}`);
    doc.text(
      `AI Confidence Score: ${
        analysis.confidence != null ? `${(analysis.confidence * 100).toFixed(1)}%` : "N/A"
      }`
    );

    if (enhancedSource || gradcamSource) {
      doc.moveDown(1);
      doc.fontSize(13).fillColor("#010110").text("Retinal Imaging");
      doc.moveDown(0.4);

      const imgY = doc.y;
      const imgWidth = 220;

      if (enhancedSource) {
        doc.fontSize(9).fillColor("#8a8f98").text("Enhanced Image", 50, imgY);
        doc.image(enhancedSource, 50, imgY + 14, { fit: [imgWidth, imgWidth] });
      }
      if (gradcamSource) {
        doc.fontSize(9).fillColor("#8a8f98").text("AI Attention Map (Grad-CAM)", 300, imgY);
        doc.image(gradcamSource, 300, imgY + 14, { fit: [imgWidth, imgWidth] });
      }

      doc.y = imgY + 14 + imgWidth + 20;
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#dddddd").stroke();
    doc.moveDown(0.6);

    doc.fontSize(12).fillColor("#010110").text("Recommendation");
    doc.fontSize(10).fillColor("#7a1f1f").text(analysis.recommendation || "N/A");

    if (specialist) {
      doc.moveDown(1);
      doc.fontSize(9).fillColor("#45545e").text(`Referred to: ${specialist.name} (${specialist.facility})`);
    }

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#45545e").text("_______________________");
    doc.text("Medical Officer Signature");

    doc.end();
  });
}

module.exports = { generateReportPdfBuffer };