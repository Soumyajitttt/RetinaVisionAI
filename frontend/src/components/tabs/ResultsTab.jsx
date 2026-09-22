import { useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import GradeBadge from "../GradeBadge";

export default function ResultsTab({
  analysis,
  onViewDetailedDiagnostics,
  onGenerateReport,
}) {
  const [view, setView] = useState("original");

  if (!analysis) {
    return (
      <p className="font-ui text-sm text-[#45545e]">
        No analysis available for this patient yet.
      </p>
    );
  }

  // NEW: dedicated state for images the quick pre-check rejected (not a
  // fundus photo). Shown instead of the normal Grade/Confidence layout so
  // a rejected upload can never be mistaken for a real (and possibly
  // stale) diagnosis.
  if (analysis.status === "reject") {
    return (
      <div className="rounded-2xl bg-white p-6 border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdeaea] text-2xl text-[#c4342a]">
            &#10060;
          </div>
          <h3 className="font-display text-lg font-medium text-[#010110]">
            Image Rejected
          </h3>
          <p className="max-w-sm font-ui text-sm text-[#45545e]">
            This upload doesn't look like a fundus/retina scan
            {analysis.rejectReason ? (
              <>
                {" "}
                (<span className="text-[#c4342a]">{analysis.rejectReason}</span>
                )
              </>
            ) : null}
            . Please upload a clear fundus photograph and try again.
          </p>
        </div>
      </div>
    );
  }

  const imageUrl =
    view === "gradcam" ? analysis.gradcam_url : analysis.enhanced_url;

  const lesionStats = [
    { label: "Microaneurysms", value: analysis.maCount },
    { label: "Intraretinal Hemorrhages", value: analysis.hemCount },
    { label: "Hard Exudates", value: analysis.exudateCount },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl bg-white p-6 border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-medium text-[#010110]">
            AI Retinal Visualization
          </h3>
          <GradeBadge grade={analysis.grade} gradeText={analysis.gradeText} />
        </div>

        <div className="flex min-h-70 items-center justify-center rounded-2xl bg-[#111318] text-white/50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={
                view === "gradcam" ? "Grad-CAM heatmap" : "Enhanced fundus scan"
              }
              className="max-h-72 rounded-xl"
            />
          ) : (
            <p className="font-ui text-sm">
              [ {view === "gradcam" ? "Grad-CAM" : "Fundus"} image not available
              ]
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setView("original")}
            className={`rounded-full px-3 py-1.5 font-ui text-sm font-medium transition ${
              view === "original"
                ? "bg-[#111318] text-white"
                : "border border-black/15 text-[#242424] hover:bg-[#f5f5f2]"
            }`}
          >
            Original Scan
          </button>
          <button
            onClick={() => setView("gradcam")}
            className={`rounded-full px-3 py-1.5 font-ui text-sm font-medium transition ${
              view === "gradcam"
                ? "bg-[#111318] text-white"
                : "border border-black/15 text-[#242424] hover:bg-[#f5f5f2]"
            }`}
          >
            Grad-CAM Heatmap
          </button>
          <button
            onClick={onViewDetailedDiagnostics}
            className="flex items-center gap-1 rounded-full border border-black/15 px-3 py-1.5 font-ui text-sm font-medium text-[#242424] transition hover:bg-[#f5f5f2]"
          >
            Detailed Diagnostics <ArrowRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-2xl bg-white p-6 border border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <h3 className="mb-4 font-display text-lg font-medium text-[#010110]">
          Detection Summary
        </h3>

        <div className="mb-5 rounded-xl bg-[#f8f8f8] px-4 py-3.5">
          <p className="font-ui text-xs font-medium uppercase tracking-wide text-[#8a8f98]">
            Confidence Level
          </p>
          <p
            className={`mt-1 font-display text-[26px] leading-none ${
              analysis.confidence != null && analysis.confidence * 100 > 90
                ? "font-bold text-[#0d7a2e]"
                : "font-semibold text-[#a50303]"
            }`}
          >
            {analysis.confidence != null
              ? `${(analysis.confidence * 100).toFixed(1)}%`
              : "N/A"}
          </p>
        </div>

        <p className="mb-2 font-ui text-xs font-medium uppercase tracking-wide text-[#8a8f98]">
          Key Lesion Highlights
        </p>
        <div className="mb-6 space-y-2">
          {lesionStats.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl border border-black/[0.06] px-3.5 py-2.5"
            >
              <span className="font-ui text-sm text-[#45545e]">{label}</span>
              <span className="font-ui text-sm font-semibold text-[#010110]">
                {value ?? "N/A"}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onGenerateReport}
          className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-full bg-[#111318] py-2.5 font-ui text-sm font-semibold text-white transition hover:bg-black"
        >
          Generate PDF Report <ArrowRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}