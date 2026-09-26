// Save as: frontend/src/components/tabs/ResultsSkeleton.jsx
//
// Mirrors ResultsTab's exact markup/classes (same two-column grid, same
// panels, same static labels and buttons) so there's zero layout shift
// when the real result swaps in - only the truly dynamic bits (grade
// badge, image, confidence %, lesion counts) are pulsing placeholders.
// Shown while an upload is being analyzed so the previous patient's
// result never flashes on screen during processing.

import { useEffect, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

// Rough stages of the analyzeImage() pipeline (see AppContext/analysis
// controller), shown one at a time so the wait feels like progress rather
// than a stuck screen.
const PIPELINE_STEPS = [
  "Running MATLAB pipeline\u2026",
  "Enhancing fundus image quality\u2026",
  "Checking image quality & centering\u2026",
  "Detecting microaneurysms & hemorrhages\u2026",
  "Scanning for hard exudates\u2026",
  "Generating Grad-CAM attention map\u2026",
  "Calibrating AI confidence score\u2026",
  "Finalizing diagnostic grade\u2026"
];

const LESION_LABELS = ["Microaneurysms", "Intraretinal Hemorrhages", "Hard Exudates"];

function Bone({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-black/10 ${className}`} />;
}

export default function ResultsSkeleton() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % PIPELINE_STEPS.length);
    }, 7600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl bg-white p-6 border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-medium text-[#010110]">
            AI Retinal Visualization
          </h3>
          {/* GradeBadge isn't known yet */}
          <Bone className="h-6 w-28 rounded-full" />
        </div>

        <div className="flex min-h-70 items-center justify-center rounded-2xl bg-[#111318] text-white/50">
          <p
            key={stepIndex}
            className="animate-[hero-reveal_300ms_ease-out] font-ui text-sm"
          >
            {PIPELINE_STEPS[stepIndex]}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            disabled
            className="cursor-wait rounded-full bg-[#111318] px-3 py-1.5 font-ui text-sm font-medium text-white opacity-60"
          >
            Original Scan
          </button>
          <button
            disabled
            className="cursor-wait rounded-full border border-black/15 px-3 py-1.5 font-ui text-sm font-medium text-[#242424] opacity-60"
          >
            Grad-CAM Heatmap
          </button>
          <button
            disabled
            className="flex cursor-wait items-center gap-1 rounded-full border border-black/15 px-3 py-1.5 font-ui text-sm font-medium text-[#242424] opacity-60"
          >
            Detailed Diagnostics <ArrowRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-2xl bg-white p-6 border border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <h3 className="mb-4 font-display text-lg font-medium text-[#010110]">
          Detection Summary
        </h3>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f8f8f8] px-4 py-3.5">
            <p className="font-ui text-xs font-medium uppercase tracking-wide text-[#8a8f98]">
              Confidence Level
            </p>
            {/* Matches the real value's font-display text-[26px] line height */}
            <Bone className="mt-1 h-[26px] w-20" />
          </div>

          <div className="rounded-xl bg-[#f8f8f8] px-4 py-3.5">
            <p className="font-ui text-xs font-medium uppercase tracking-wide text-[#8a8f98]">
              Lesion Overlap
            </p>
            <Bone className="mt-1 h-[26px] w-20" />
          </div>
        </div>

        <p className="mb-2 font-ui text-xs font-medium uppercase tracking-wide text-[#8a8f98]">
          Key Lesion Highlights
        </p>
        <div className="mb-6 space-y-2">
          {LESION_LABELS.map((label) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl border border-black/[0.06] px-3.5 py-2.5"
            >
              <span className="font-ui text-sm text-[#45545e]">{label}</span>
              <Bone className="h-4 w-10" />
            </div>
          ))}
        </div>

        <button
          disabled
          className="mt-auto flex w-full cursor-wait items-center justify-center gap-1.5 rounded-full bg-[#111318] py-2.5 font-ui text-sm font-semibold text-white opacity-60"
        >
          Generate PDF Report <ArrowRightIcon className="size-4" />
        </button>
      </div>
    </div>
  );
}