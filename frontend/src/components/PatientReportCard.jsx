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
 * counts, and every explainability image the pipeline produced
 * (enhanced/Grad-CAM/Cross-Method/Multi-Layer CAM/Activations), plus
 * recommendation. Used by both DoctorInboxPage (inside each referral's
 * expandable card) and DiscussionDetailPage (so the invited doctor sees
 * the actual report the discussion is about, not just the subject line).
 *
 * NEW: previously only rendered enhanced_url/gradcam_url - the newer
 * multilayer_url/crossmethod_url/activations_url fields (now produced by
 * runPipelineForWeb.m's Module 4) were silently dropped here, even though
 * ResultsTab.jsx and PdfReportPage.jsx already show them. Doctors were
 * seeing only 2 of the 5 explainability views.
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

  const enhancedSrc = analysis.enhanced_url || analysis.enhancedUrl;
  const gradcamSrc = analysis.gradcam_url || analysis.gradcamUrl;
  const crossmethodSrc = analysis.crossmethod_url || analysis.crossMethodUrl;
  const multilayerSrc = analysis.multilayer_url || analysis.multiLayerUrl;
  const activationsSrc = analysis.activations_url || analysis.activationsUrl;
  const hasImaging = enhancedSrc || gradcamSrc || crossmethodSrc || multilayerSrc || activationsSrc;

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

      {hasImaging && (
        <div className="mb-5 border-t border-black/10 pt-4">
          <h4 className="mb-3 font-display font-medium text-[#010110]">
            Retinal Imaging &amp; AI Explainability
          </h4>

          {(enhancedSrc || gradcamSrc) && (
            <div className="mb-4 grid grid-cols-2 gap-4">
              {enhancedSrc && (
                <div>
                  <p className="mb-1 font-ui text-xs font-semibold uppercase text-[#8a8f98]">
                    Enhanced Image
                  </p>
                  <img
                    src={enhancedSrc}
                    alt="Enhanced fundus scan"
                    className="w-full rounded-xl border border-black/10"
                  />
                </div>
              )}
              {gradcamSrc && (
                <div>
                  <p className="mb-1 font-ui text-xs font-semibold uppercase text-[#8a8f98]">
                    AI Attention Map (Grad-CAM)
                  </p>
                  <img
                    src={gradcamSrc}
                    alt="Grad-CAM heatmap"
                    className="w-full rounded-xl border border-black/10"
                  />
                </div>
              )}
            </div>
          )}

          {crossmethodSrc && (
            <div className="mt-4">
              <p className="mb-1 font-ui text-xs font-semibold uppercase text-[#8a8f98]">
                Tri-Method Verification (Grad-CAM vs Occlusion vs LIME)
              </p>
              <img
                src={crossmethodSrc}
                alt="Grad-CAM vs Occlusion vs LIME comparison"
                className="w-full rounded-xl border border-black/10"
              />
            </div>
          )}

          {multilayerSrc && (
            <div className="mt-4">
              <p className="mb-1 font-ui text-xs font-semibold uppercase text-[#8a8f98]">
                Depth-Wise Grad-CAM Progression (Early / Mid / Late)
              </p>
              <img
                src={multilayerSrc}
                alt="Multi-layer Grad-CAM progression"
                className="w-full rounded-xl border border-black/10"
              />
            </div>
          )}

          {activationsSrc && (
            <div className="mt-4">
              <p className="mb-1 font-ui text-xs font-semibold uppercase text-[#8a8f98]">
                Multi-Depth Feature Activations (Edges / Textures / Lesions)
              </p>
              <img
                src={activationsSrc}
                alt="Neural activations panel"
                className="w-full rounded-xl border border-black/10"
              />
            </div>
          )}
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