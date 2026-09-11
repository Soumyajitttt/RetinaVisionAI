import { useState } from "react";
import GradeBadge from "../GradeBadge";

export default function ResultsTab({
  analysis,
  onViewDetailedDiagnostics,
  onGenerateReport,
}) {
  const [view, setView] = useState("original");

  if (!analysis) {
    return (
      <p className="font-tight text-sm text-[#45545e]">
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
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdeaea] text-2xl text-[#c4342a]">
            &#10060;
          </div>
          <h3 className="font-helvetica-neue text-lg font-medium text-[#010110]">
            Image Rejected
          </h3>
          <p className="max-w-sm font-tight text-sm text-[#45545e]">
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-helvetica-neue text-lg font-medium text-[#010110]">
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
            <p className="font-tight text-sm">
              [ {view === "gradcam" ? "Grad-CAM" : "Fundus"} image not available
              ]
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setView("original")}
            className={`rounded-full px-3 py-1.5 font-tight text-sm font-medium transition ${
              view === "original"
                ? "bg-[#111318] text-white"
                : "border border-black/15 text-[#242424] hover:bg-[#f5f5f2]"
            }`}
          >
            Original Scan
          </button>
          <button
            onClick={() => setView("gradcam")}
            className={`rounded-full px-3 py-1.5 font-tight text-sm font-medium transition ${
              view === "gradcam"
                ? "bg-[#111318] text-white"
                : "border border-black/15 text-[#242424] hover:bg-[#f5f5f2]"
            }`}
          >
            Grad-CAM Heatmap
          </button>
          <button
            onClick={onViewDetailedDiagnostics}
            className="rounded-full border border-black/15 px-3 py-1.5 font-tight text-sm font-medium text-[#242424] transition hover:bg-[#f5f5f2]"
          >
            Detailed Diagnostics &rarr;
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
        <h3 className="mb-3 font-helvetica-neue text-lg font-medium text-[#010110]">
          Detection Summary
        </h3>
        <p className="mb-4 font-tight text-sm text-[#45545e]">
          Confidence Level:{" "}
          <strong className="text-[#010110]">
            {analysis.confidence != null
              ? `${(analysis.confidence * 100).toFixed(1)}%`
              : "N/A"}
          </strong>
        </p>

        <h4 className="mb-2 font-tight text-sm font-semibold text-[#242424]">
          Key Lesion Highlights
        </h4>
        <ul className="mb-5 space-y-1 font-tight text-sm text-[#45545e]">
          <li>
            Microaneurysms:{" "}
            <strong className="text-[#010110]">
              {analysis.maCount ?? "N/A"}
            </strong>
          </li>
          <li>
            Intraretinal Hemorrhages:{" "}
            <strong className="text-[#010110]">
              {analysis.hemCount ?? "N/A"}
            </strong>
          </li>
          <li>
            Hard Exudates:{" "}
            <strong className="text-[#010110]">
              {analysis.exudateCount ?? "N/A"}
            </strong>
          </li>
        </ul>

        <button
          onClick={onGenerateReport}
          className="w-full rounded-full bg-[#111318] py-2 font-tight text-sm font-semibold text-white transition hover:bg-black"
        >
          Generate PDF Report &rarr;
        </button>
      </div>
    </div>
  );
}
