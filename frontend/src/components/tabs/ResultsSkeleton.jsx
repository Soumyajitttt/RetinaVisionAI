// Save as: frontend/src/components/tabs/ResultsSkeleton.jsx
//
// Mirrors ResultsTab's layout (image area + Detection Summary panel) but
// with pulsing gray placeholders instead of real content. Shown while an
// upload is being analyzed so the previous patient's result never flashes
// on screen during processing.

function Bone({ className = "" }) {
  return (
    <div className={`animate-pulse rounded-md bg-black/10 ${className}`} />
  );
}

export default function ResultsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Bone className="h-6 w-48" />
          <Bone className="h-6 w-28 rounded-full" />
        </div>

        <div className="flex min-h-70 items-center justify-center rounded-2xl bg-[#f0f0f0]">
          <p className="font-tight text-sm text-[#8a8f98]">
            Running MATLAB pipeline&hellip;
          </p>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Bone className="h-8 w-28 rounded-full" />
          <Bone className="h-8 w-36 rounded-full" />
          <Bone className="h-8 w-40 rounded-full" />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
        <Bone className="mb-4 h-6 w-40" />
        <Bone className="mb-6 h-4 w-32" />

        <Bone className="mb-3 h-4 w-36" />
        <div className="mb-5 space-y-3">
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
        </div>

        <Bone className="h-9 w-full rounded-full" />
      </div>
    </div>
  );
}
