import { ArrowRightIcon } from "@heroicons/react/24/outline";

export default function ReportTab({ patient, analysis, onReferToSpecialist }) {
  if (!analysis) {
    return <p className="font-ui text-sm text-[#45545e]">No report available for this patient yet.</p>;
  }

  return (
    <div className="rounded-2xl bg-white p-6 border border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <h3 className="mb-2 font-display text-lg font-medium text-[#010110]">Executive Clinical Summary</h3>
      <p className="mb-4 font-ui text-sm text-[#45545e]">
        Evaluation report generated following ICMR Diabetic Retinopathy guidelines.
      </p>

      <div className="mb-6 rounded-xl border-l-4 border-red-500 bg-red-50 p-4">
        <strong className="text-red-800">Action Required</strong>
        <p className="mt-1 font-ui text-sm text-red-700">{analysis.recommendation}</p>
      </div>

      <button
        onClick={onReferToSpecialist}
        className="flex items-center gap-1.5 rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
      >
        Refer to Specialist <ArrowRightIcon className="size-4" />
      </button>
    </div>
  );
}