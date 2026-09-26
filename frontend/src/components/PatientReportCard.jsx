// Same ICDR-based plain-language grade notes used on PdfReportPage /
// GradingDetailPage / DoctorInboxPage - kept here so every place that
// shows a report explains the grade the same way.
const GRADE_NOTES = {
  0: "No signs of diabetic retinopathy detected. Continue routine annual screening.",
  1: "Mild NPDR - a small number of microaneurysms are visible, usually the earliest detectable sign. Recommend re-screening within 12 months.",
  2: "Moderate NPDR - more numerous microaneurysms and small hemorrhages, not yet at severe-stage levels. Recommend follow-up within 6-12 months.",
  3: "Severe NPDR - extensive hemorrhages and microaneurysms across all quadrants, a strong signal of imminent progression. Recommend urgent referral within 2 weeks.",
  4: "Proliferative DR - abnormal new blood vessel growth and/or vitreous hemorrhage; the most advanced, vision-threatening stage. Recommend immediate referral for treatment."
};

/**
 * Full patient + AI report block: patient info, grading result, lesion
 * counts, enhanced/Grad-CAM images, and recommendation. Used by both
 * DoctorInboxPage (inside each referral's expandable card) and
 * DiscussionDetailPage (so the invited doctor sees the actual report the
 * discussion is about, not just the subject line).
 */
export default function PatientReportCard({ patient, analysis }) {
  if (!patient || !analysis) {
    return (
      <p className="font-ui text-sm text-[#45545e]">
        Full report data isn't available right now (the patient or analysis record may have been
        removed, or is still processing).
      </p>
    );
  }

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-[#f8f8f8] p-4 font-ui text-sm text-[#242424]">
        <div>
          <strong>Patient Name:</strong> {patient.name}
        </div>
        <div>
          <strong>Patient ID:</strong> {patient.id}
        </div>
        <div>
          <strong>Age / Gender:</strong> {patient.age} Yrs / {patient.gender}
        </div>
        <div>
          <strong>Location:</strong> {patient.village}
        </div>
      </div>

      <div className="mb-5">
        <h4 className="mb-2 border-b border-black/10 pb-2 font-display font-medium text-[#010110]">
          Automated Diagnostic Findings
        </h4>
        <div className="mb-2 font-ui text-sm text-[#242424]">
          <strong>Grading Result:</strong> {analysis.gradeText}
        </div>
        {GRADE_NOTES[analysis.grade] && (
          <p className="mb-2 font-ui text-sm italic leading-relaxed text-[#45545e]">
            {GRADE_NOTES[analysis.grade]}
          </p>
        )}
        <p className="font-ui text-sm leading-relaxed text-[#242424]">
          Microaneurysms: {analysis.maCount ?? "N/A"} <br />
          Intraretinal Hemorrhages: {analysis.hemCount ?? "N/A"} <br />
          Hard Exudates: {analysis.exudateCount ?? "N/A"} <br />
          AI Confidence Score:{" "}
          {analysis.confidence != null ? `${(analysis.confidence * 100).toFixed(1)}%` : "N/A"}{" "}
          <br />
          Lesion Overlap:{" "}
          {analysis.lesionOverlap != null ? `${(analysis.lesionOverlap * 100).toFixed(1)}%` : "N/A"}
        </p>
      </div>

      {(analysis.enhanced_url || analysis.gradcam_url) && (
        <div className="mb-5 border-t border-black/10 pt-4">
          <h4 className="mb-3 font-display font-medium text-[#010110]">Retinal Imaging</h4>
          <div className="grid grid-cols-2 gap-4">
            {analysis.enhanced_url && (
              <div>
                <p className="mb-1 font-ui text-xs font-semibold uppercase text-[#8a8f98]">
                  Enhanced Image
                </p>
                <img
                  src={analysis.enhanced_url}
                  alt="Enhanced fundus scan"
                  className="w-full rounded-xl border border-black/10"
                />
              </div>
            )}
            {analysis.gradcam_url && (
              <div>
                <p className="mb-1 font-ui text-xs font-semibold uppercase text-[#8a8f98]">
                  AI Attention Map (Grad-CAM)
                </p>
                <img
                  src={analysis.gradcam_url}
                  alt="Grad-CAM heatmap"
                  className="w-full rounded-xl border border-black/10"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {analysis.recommendation && (
        <div className="border-t border-black/10 pt-4">
          <h4 className="mb-1 font-display font-medium text-[#010110]">Recommendation</h4>
          <p className="font-ui text-sm font-semibold text-red-800">{analysis.recommendation}</p>
        </div>
      )}
    </>
  );
}