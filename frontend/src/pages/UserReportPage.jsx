import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useApp } from "../context/AppContext";
import ReportTabs from "../components/ReportTabs";
import AnalysisTab from "../components/tabs/AnalysisTab";
import ResultsTab from "../components/tabs/ResultsTab";
import ResultsSkeleton from "../components/tabs/ResultsSkeleton";
import ReportTab from "../components/tabs/ReportTab";
import FadeIn from "../components/FadeIn";

export default function UserReportPage() {
  const { activePatient, activeAnalysis, analyzeImage } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analysis");
  const [uploadError, setUploadError] = useState("");
  // NEW: true from the moment a file is selected until analyzeImage()
  // resolves/rejects. Used to show a skeleton instead of activeAnalysis
  // (which is still the *previous* patient/result until the request
  // finishes), so a stale image/grade never flashes on screen.
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!activePatient) {
    return (
      <FadeIn>
        <section className="rounded-2xl bg-white p-6 text-center border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="mb-4 font-ui text-sm text-[#45545e]">
            No patient selected. Go to the Database page and choose a patient.
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

  async function handleImageSelected(file) {
    setUploadError("");
    setIsAnalyzing(true);
    // Jump to the Results tab immediately so the skeleton is what the
    // person sees during processing, instead of them having to click
    // "Run AI Diagnostics" and land on a stale/old result.
    setActiveTab("results");
    try {
      // Posts to /api/analysis/:patientId/upload (see
      // backend/src/controllers/analysisController.js), which runs the
      // MATLAB pipeline (or a mock result until MATLAB is configured).
      await analyzeImage(activePatient.id, file);
    } catch (err) {
      setUploadError(err.message || "Failed to analyze image");
      // If it failed, send them back to Analysis so they can retry rather
      // than sitting on an empty Results tab.
      setActiveTab("analysis");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleRunDiagnostics() {
    setActiveTab("results");
  }

  return (
    <FadeIn>
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded-full bg-[#eef2f6] px-2 py-0.5 font-ui text-xs font-semibold text-[#334155]">
              ACTIVE USER REPORT
            </span>
            <h1 className="mt-1 font-display text-[28px] font-semibold tracking-tight text-[#0a0e14]">
              {activePatient.name} (ID: {activePatient.id})
            </h1>
          </div>
          <button
            onClick={() => navigate("/database")}
            className="flex items-center gap-1.5 rounded-full border border-black/15 px-4 py-2 font-ui text-sm font-medium text-[#242424] transition hover:bg-[#f5f5f2]"
          >
            <ArrowLeftIcon className="size-4" /> Back to Database
          </button>
        </div>

        <ReportTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "analysis" && (
          <>
            {uploadError && (
              <p className="mb-3 font-ui text-sm font-medium text-red-600">
                {uploadError}
              </p>
            )}
            <AnalysisTab
              analysis={activeAnalysis}
              isAnalyzing={isAnalyzing}
              onImageSelected={handleImageSelected}
              onRunDiagnostics={handleRunDiagnostics}
            />
          </>
        )}

        {activeTab === "results" &&
          (isAnalyzing ? (
            <ResultsSkeleton />
          ) : (
            <ResultsTab
              analysis={activeAnalysis}
              onViewDetailedDiagnostics={() => navigate("/grading")}
              onGenerateReport={() => navigate("/pdf-report")}
            />
          ))}

        {/* {activeTab === "report" && (
          <ReportTab
            patient={activePatient}
            analysis={activeAnalysis}
            onReferToSpecialist={() => navigate("/specialists")}
          />
        )} */}
      </section>
    </FadeIn>
  );
}