import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useApp } from "../context/AppContext";
import FadeIn from "../components/FadeIn";

// Plain-language notes for each ICDR (International Clinical Diabetic
// Retinopathy) severity grade, 0-4, shown alongside the automated result so
// a field worker can see what the grade means and roughly how urgent it is.
const GRADE_EXPLANATIONS = {
  0: {
    label: "Grade 0 · No DR",
    urgency: "Routine",
    urgencyColor: "text-emerald-400",
    description:
      "The retina looks healthy with no microaneurysms, hemorrhages, or exudates detected. No signs of diabetic retinopathy at this time.",
    action: "Continue routine annual screening as part of standard diabetes care."
  },
  1: {
    label: "Grade 1 · Mild NPDR",
    urgency: "Low urgency",
    urgencyColor: "text-lime-400",
    description:
      "A small number of microaneurysms - tiny bulges in the retina's capillaries - are visible. This is usually the earliest detectable sign of diabetic retinopathy.",
    action: "Recommend re-screening within 12 months to track any progression."
  },
  2: {
    label: "Grade 2 · Moderate NPDR",
    urgency: "Monitor",
    urgencyColor: "text-yellow-400",
    description:
      "More numerous microaneurysms and small retinal hemorrhages are present, sometimes with hard exudates or cotton-wool spots, but not yet at severe-stage levels.",
    action: "Recommend follow-up with an ophthalmologist within 6-12 months."
  },
  3: {
    label: "Grade 3 · Severe NPDR",
    urgency: "Urgent",
    urgencyColor: "text-orange-400",
    description:
      "Extensive hemorrhages and microaneurysms are visible across all quadrants of the retina, with possible venous beading and microvascular abnormalities - a strong signal that the disease is close to advancing to the proliferative stage.",
    action: "Recommend urgent referral to a retina specialist, ideally within 2 weeks."
  },
  4: {
    label: "Grade 4 · Proliferative DR",
    urgency: "Emergency",
    urgencyColor: "text-red-400",
    description:
      "Abnormal new blood vessels (neovascularization) and/or vitreous hemorrhage are present. This is the most advanced, vision-threatening stage of diabetic retinopathy.",
    action: "Recommend immediate referral for treatment such as laser photocoagulation or anti-VEGF therapy to help prevent vision loss."
  }
};

export default function GradingDetailPage() {
  const { activePatient, activeAnalysis } = useApp();
  const navigate = useNavigate();

  if (!activePatient || !activeAnalysis) {
    return (
      <FadeIn>
        <section className="rounded-2xl bg-white p-6 text-center border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="mb-4 font-ui text-sm text-[#45545e]">No patient/analysis selected yet.</p>
          <button
            onClick={() => navigate("/database")}
            className="rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
          >
            Back to Database
          </button>
        </section>
      </FadeIn>
    );
  }

  const crossMethodSrc = activeAnalysis.crossmethod_url || activeAnalysis.crossMethodUrl;
  const multiLayerSrc = activeAnalysis.multilayer_url || activeAnalysis.multiLayerUrl;
  const activationsSrc = activeAnalysis.activations_url || activeAnalysis.activationsUrl;

  const hasExplainability = crossMethodSrc || multiLayerSrc || activationsSrc;

  return (
    <FadeIn>
      <section className="rounded-2xl bg-white p-6 border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-medium text-[#010110]">Diagnostic Grading &amp; Grad-CAM Analysis</h2>
          <button
            onClick={() => navigate("/report")}
            className="flex items-center gap-1.5 rounded-full border border-black/15 px-4 py-2 font-ui text-sm font-medium text-[#242424] transition hover:bg-[#f5f5f2]"
          >
            <ArrowLeftIcon className="size-4" /> Back to User Report
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl bg-[#f8f8f8] p-5">
            <h4 className="font-ui text-xs font-bold uppercase text-[#8a8f98]">1. Grade</h4>
            <div className="my-2 text-xl font-extrabold text-red-600">{activeAnalysis.gradeText}</div>
            <p className="font-ui text-sm text-[#45545e]">Automated grading based on lesion density and distribution.</p>
          </div>

          <div className="rounded-2xl bg-[#f8f8f8] p-5">
            <h4 className="font-ui text-xs font-bold uppercase text-[#8a8f98]">2. Confidence</h4>
            <div className="my-2 text-xl font-extrabold text-[#010110]">
              {activeAnalysis.confidence != null ? `${(activeAnalysis.confidence * 100).toFixed(1)}%` : "N/A"}
            </div>
            <p className="font-ui text-sm text-[#45545e]">Calibrated against Indian fundus dataset variations.</p>
          </div>

          <div className="rounded-2xl bg-[#f8f8f8] p-5">
            <h4 className="font-ui text-xs font-bold uppercase text-[#8a8f98]">3. Grad-CAM</h4>
            <div className="my-2 text-lg font-bold text-[#010110]">
              {activeAnalysis.gradcam_url ? "Heatmap Available" : "Heatmap Pending"}
            </div>
            <p className="font-ui text-sm text-[#45545e]">Explains the neural network focus areas for clinician verification.</p>
          </div>
        </div>

        {hasExplainability && (
          <div className="mt-8">
            <h3 className="mb-3 font-display font-medium text-[#010110]">
              Explainability Suite (Multi-Method Verification)
            </h3>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {crossMethodSrc && (
                <div className="rounded-2xl bg-[#f8f8f8] p-4 flex flex-col justify-between">
                  <div>
                    <p className="mb-2 font-ui text-xs font-semibold uppercase tracking-wide text-[#8a8f98]">
                      Independent Cross-Method Comparison
                    </p>
                    <img
                      src={crossMethodSrc}
                      alt="Grad-CAM vs Occlusion vs LIME comparison"
                      className="w-full rounded-xl object-contain bg-black"
                    />
                  </div>
                </div>
              )}
              {multiLayerSrc && (
                <div className="rounded-2xl bg-[#f8f8f8] p-4 flex flex-col justify-between">
                  <div>
                    <p className="mb-2 font-ui text-xs font-semibold uppercase tracking-wide text-[#8a8f98]">
                      Depth-wise Grad-CAM Progression
                    </p>
                    <img
                      src={multiLayerSrc}
                      alt="Multi-layer Grad-CAM progression"
                      className="w-full rounded-xl object-contain bg-black"
                    />
                  </div>
                </div>
              )}
              {activationsSrc && (
                <div className="rounded-2xl bg-[#f8f8f8] p-4 flex flex-col justify-between">
                  <div>
                    <p className="mb-2 font-ui text-xs font-semibold uppercase tracking-wide text-[#8a8f98]">
                      Depth-wise Feature Activations
                    </p>
                    <img
                      src={activationsSrc}
                      alt="Multi-depth feature activations"
                      className="w-full rounded-xl object-contain bg-black"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(() => {
          const info = GRADE_EXPLANATIONS[activeAnalysis.grade];

          if (!info) {
            return (
              <div className="mt-8 rounded-2xl bg-[#111318] p-6 text-white">
                <h3 className="mb-2 font-display font-medium text-white">Grade Explanation</h3>
                <p className="font-ui text-sm leading-relaxed text-white/70">
                  No grade-specific explanation is available for this result yet.
                </p>
              </div>
            );
          }

          return (
            <div className="mt-8 rounded-2xl bg-[#111318] p-6 text-white">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-medium text-white">{info.label}</h3>
                <span className={`font-ui text-xs font-semibold uppercase tracking-wide ${info.urgencyColor}`}>
                  {info.urgency}
                </span>
              </div>
              <p className="font-ui text-sm leading-relaxed text-white/70">{info.description}</p>
              <p className="mt-3 font-ui text-sm leading-relaxed text-white/90">{info.action}</p>
            </div>
          );
        })()}
      </section>
    </FadeIn>
  );
}