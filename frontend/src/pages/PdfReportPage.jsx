import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { useApp } from "../context/AppContext";
import FadeIn from "../components/FadeIn";

// Same ICDR-based plain-language grade notes shown on the Diagnostic AI
// page, kept here too so the printed/PDF report explains what the grade
// means rather than just stating a number.
const GRADE_NOTES = {
  0: "No signs of diabetic retinopathy detected. Continue routine annual screening.",
  1: "Mild NPDR - a small number of microaneurysms are visible, usually the earliest detectable sign. Recommend re-screening within 12 months.",
  2: "Moderate NPDR - more numerous microaneurysms and small hemorrhages, not yet at severe-stage levels. Recommend follow-up within 6-12 months.",
  3: "Severe NPDR - extensive hemorrhages and microaneurysms across all quadrants, a strong signal of imminent progression. Recommend urgent referral within 2 weeks.",
  4: "Proliferative DR - abnormal new blood vessel growth and/or vitreous hemorrhage; the most advanced, vision-threatening stage. Recommend immediate referral for treatment."
};

export default function PdfReportPage() {
  const { activePatient, activeAnalysis } = useApp();
  const navigate = useNavigate();

  if (!activePatient || !activeAnalysis) {
    return (
      <FadeIn>
        <section className="rounded-2xl bg-white p-6 text-center border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="mb-4 font-ui text-sm text-[#45545e]">
            No patient/analysis selected yet.
          </p>
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

  return (
    <FadeIn>
      <section>
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h2 className="font-display text-lg font-medium text-[#010110]">
            Report Preview
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/report")}
              className="flex items-center gap-1.5 rounded-full border border-black/15 px-4 py-2 font-ui text-sm font-medium text-[#242424] transition hover:bg-[#f5f5f2]"
            >
              <ArrowLeftIcon className="size-4" /> Edit
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
            >
              Download / Print PDF <ArrowRightIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative mx-auto max-w-3xl rounded-2xl border border-black/[0.06] bg-white p-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)] print:m-0 print:max-w-none print:rounded-none print:border-none print:p-6 print:shadow-none">
          <div className="mb-6 flex justify-between border-b-2 border-black/10 pb-4">
            <div>
              <h2 className="font-display text-xl font-medium text-[#010110]">
                PRIMARY HEALTH CENTRE TELE-RETINA REPORT
              </h2>
              <p className="font-ui text-sm text-[#45545e]">
                Diabetic Retinopathy Screening Network • India
              </p>
            </div>

            <div className="text-right font-ui text-sm text-[#45545e]">
              <div>
                Report ID: R-{Math.floor(Math.random() * 900000 + 100000)}
              </div>
              <div>
                Date:{" "}
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 rounded-xl bg-[#f8f8f8] p-4 font-ui text-sm text-[#242424]">
            <div>
              <strong>Patient Name:</strong> {activePatient.name}
            </div>
            <div>
              <strong>Patient ID:</strong> {activePatient.id}
            </div>
            <div>
              <strong>Age / Gender:</strong> {activePatient.age} Yrs /{" "}
              {activePatient.gender}
            </div>
            <div>
              <strong>Location:</strong> {activePatient.village}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-2 border-b border-black/10 pb-2 font-display font-medium text-[#010110]">
              Automated Diagnostic Findings
            </h3>
            <div className="mb-2 font-ui text-sm text-[#242424]">
              <strong>Grading Result:</strong> {activeAnalysis.gradeText}
            </div>
            {GRADE_NOTES[activeAnalysis.grade] && (
              <p className="mb-2 font-ui text-sm italic leading-relaxed text-[#45545e]">
                {GRADE_NOTES[activeAnalysis.grade]}
              </p>
            )}
            <p className="font-ui text-sm leading-relaxed text-[#242424]">
              Microaneurysms: {activeAnalysis.maCount ?? "N/A"} <br />
              Intraretinal Hemorrhages: {activeAnalysis.hemCount ?? "N/A"}{" "}
              <br />
              Hard Exudates: {activeAnalysis.exudateCount ?? "N/A"} <br />
              AI Confidence Score:{" "}
              {activeAnalysis.confidence != null
                ? `${(activeAnalysis.confidence * 100).toFixed(1)}%`
                : "N/A"}
            </p>
          </div>

          {(activeAnalysis.enhanced_url || activeAnalysis.gradcam_url) && (
            <div className="mb-6 border-t border-black/10 pt-4">
              <h3 className="mb-3 font-display font-medium text-[#010110]">
                Retinal Imaging
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {activeAnalysis.enhanced_url && (
                  <div>
                    <p className="mb-1 font-ui text-xs font-semibold uppercase text-[#8a8f98]">
                      Enhanced Image
                    </p>
                    <img
                      src={activeAnalysis.enhanced_url}
                      alt="Enhanced fundus scan"
                      className="w-full rounded-xl border border-black/10"
                    />
                  </div>
                )}
                {activeAnalysis.gradcam_url && (
                  <div>
                    <p className="mb-1 font-ui text-xs font-semibold uppercase text-[#8a8f98]">
                      AI Attention Map (Grad-CAM)
                    </p>
                    <img
                      src={activeAnalysis.gradcam_url}
                      alt="Grad-CAM heatmap"
                      className="w-full rounded-xl border border-black/10"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-black/10 pt-4">
            <h4 className="mb-1 font-display font-medium text-[#010110]">
              Recommendation
            </h4>
            <p className="font-ui text-sm font-semibold text-red-800">
              {activeAnalysis.recommendation}
            </p>
          </div>

          <div className="mt-10 font-ui text-sm text-[#45545e]">
            <div>_______________________</div>
            <div>Medical Officer Signature</div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}