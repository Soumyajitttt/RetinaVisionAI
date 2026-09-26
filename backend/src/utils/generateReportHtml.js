// Renders the same report shown on the frontend's Report Preview page
// (frontend/src/pages/PdfReportPage.jsx) and the doctor portal's
// PatientReportCard.jsx as a single self-contained HTML string, for
// sending directly as the referral email's body - see specialistController.js.
//
// Deliberately NOT a PDF and NOT an .html file attachment: this is the
// actual message body, so the specialist sees the full report the moment
// they open the email instead of having to open an attachment first.
//
// Email clients (Gmail, Outlook, Apple Mail, etc.) strip <style> blocks and
// most CSS unpredictably, and many don't support flexbox/grid at all - so
// everything here is plain inline `style="..."` attributes on simple
// block-level tags, the one layout approach that survives every major
// client. Images are referenced by their existing Cloudinary https:// URLs
// rather than fetched/embedded, since remote <img> tags are the standard,
// well-supported way to show images in an email (unlike inline PDF
// generation, no buffering/fetching is needed here at all).

const GRADE_NOTES = {
  0: "No signs of diabetic retinopathy detected. Continue routine annual screening.",
  1: "Mild NPDR - a small number of microaneurysms are visible, usually the earliest detectable sign. Recommend re-screening within 12 months.",
  2: "Moderate NPDR - more numerous microaneurysms and small hemorrhages, not yet at severe-stage levels. Recommend follow-up within 6-12 months.",
  3: "Severe NPDR - extensive hemorrhages and microaneurysms across all quadrants, a strong signal of imminent progression. Recommend urgent referral within 2 weeks.",
  4: "Proliferative DR - abnormal new blood vessel growth and/or vitreous hemorrhage; the most advanced, vision-threatening stage. Recommend immediate referral for treatment."
};

const IMAGE_FIELDS = [
  { key: "enhanced_url", label: "Enhanced Image", alt: "Enhanced fundus scan" },
  { key: "gradcam_url", label: "AI Attention Map (Grad-CAM)", alt: "Grad-CAM heatmap" },
  { key: "crossmethod_url", label: "Tri-Method Verification (Grad-CAM vs Occlusion vs LIME)", alt: "Grad-CAM vs Occlusion vs LIME comparison" },
  { key: "multilayer_url", label: "Depth-Wise Grad-CAM Progression (Early / Mid / Late)", alt: "Multi-layer Grad-CAM progression" },
  { key: "activations_url", label: "Multi-Depth Feature Activations (Edges / Textures / Lesions)", alt: "Neural activations panel" }
];

function pct(value) {
  return value != null ? `${(value * 100).toFixed(1)}%` : "N/A";
}

// Minimal, dependency-free HTML-escaping for the handful of free-text
// fields (names, village, recommendation) that come from the database
// rather than being fixed strings we wrote ourselves.
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function generateReportHtml({ patient, analysis, specialist }) {
  const reportId = `R-${Math.floor(Math.random() * 900000 + 100000)}`;
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  const gradeNote = analysis.grade != null ? GRADE_NOTES[analysis.grade] : null;

  const images = IMAGE_FIELDS.filter((f) => analysis[f.key]);
  const imagesHtml = images.length
    ? `
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #dddddd;">
        <h3 style="margin:0 0 12px;font-size:15px;color:#010110;">Retinal Imaging &amp; AI Explainability</h3>
        ${images
          .map(
            (f) => `
          <div style="margin-bottom:16px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;color:#8a8f98;">${esc(f.label)}</p>
            <img src="${esc(analysis[f.key])}" alt="${esc(f.alt)}" width="480" style="max-width:100%;height:auto;border-radius:10px;border:1px solid #dddddd;display:block;" />
          </div>`
          )
          .join("")}
      </div>`
    : "";

  return `
<div style="max-width:600px;margin:0 auto;padding:24px;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#242424;">
  <div style="border-bottom:2px solid #dddddd;padding-bottom:16px;margin-bottom:20px;">
    <h2 style="margin:0;font-size:18px;color:#010110;">PRIMARY HEALTH CENTRE TELE-RETINA REPORT</h2>
    <p style="margin:4px 0 0;font-size:13px;color:#45545e;">Diabetic Retinopathy Screening Network - India</p>
    <p style="margin:8px 0 0;font-size:12px;color:#45545e;">Report ID: ${esc(reportId)} &nbsp;|&nbsp; Date: ${esc(dateStr)}</p>
  </div>

  <div style="background:#f8f8f8;border-radius:10px;padding:14px 16px;margin-bottom:20px;font-size:13px;line-height:1.6;">
    <div><strong>Patient Name:</strong> ${esc(patient.name)}</div>
    <div><strong>Patient ID:</strong> ${esc(patient.patientId)}</div>
    <div><strong>Age / Gender:</strong> ${esc(patient.age)} Yrs / ${esc(patient.gender)}</div>
    <div><strong>Location:</strong> ${esc(patient.village || "N/A")}</div>
  </div>

  <div style="margin-bottom:20px;">
    <h3 style="margin:0 0 8px;padding-bottom:8px;border-bottom:1px solid #dddddd;font-size:15px;color:#010110;">Automated Diagnostic Findings</h3>
    <p style="margin:0 0 6px;font-size:13px;"><strong>Grading Result:</strong> ${esc(analysis.gradeText || "N/A")}</p>
    ${gradeNote ? `<p style="margin:0 0 10px;font-size:12px;font-style:italic;color:#45545e;">${esc(gradeNote)}</p>` : ""}
    <p style="margin:0;font-size:13px;line-height:1.7;">
      Microaneurysms: ${esc(analysis.maCount ?? "N/A")}<br />
      Intraretinal Hemorrhages: ${esc(analysis.hemCount ?? "N/A")}<br />
      Hard Exudates: ${esc(analysis.exudateCount ?? "N/A")}<br />
      AI Confidence Score: ${pct(analysis.confidence)}<br />
      Lesion Overlap: ${pct(analysis.lesionOverlap)}
    </p>
  </div>

  ${imagesHtml}

  <div style="margin-top:20px;padding-top:14px;border-top:1px solid #dddddd;">
    <h4 style="margin:0 0 4px;font-size:14px;color:#010110;">Recommendation</h4>
    <p style="margin:0;font-size:13px;font-weight:600;color:#7a1f1f;">${esc(analysis.recommendation || "N/A")}</p>
  </div>

  ${
    specialist
      ? `<p style="margin:16px 0 0;font-size:11px;color:#45545e;">Referred to: ${esc(specialist.name)} (${esc(specialist.facility)})</p>`
      : ""
  }

  <div style="margin-top:32px;font-size:12px;color:#45545e;">
    <div>_______________________</div>
    <div>Medical Officer Signature</div>
  </div>
</div>`;
}

module.exports = { generateReportHtml };