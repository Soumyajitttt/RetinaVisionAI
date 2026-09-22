import { ArrowRightIcon } from "@heroicons/react/24/outline";

export default function AnalysisTab({ analysis, onImageSelected, onRunDiagnostics }) {
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onImageSelected(file);
  }

  const quality = analysis?.quality;

  return (
    <div className="rounded-2xl bg-white p-6 border border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <h3 className="mb-4 font-display text-lg font-medium text-[#010110]">Field Image Upload &amp; Calibration</h3>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-dashed border-black/10 bg-[#f8f8f8] p-8 text-center">
          <h4 className="mb-1 font-ui font-semibold text-[#242424]">Upload Fundus Image Scan</h4>
          <p className="mb-4 font-ui text-sm text-[#45545e]">Supports portable smartphone &amp; handheld cameras</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mx-auto block font-ui text-sm text-[#45545e] file:mr-3 file:rounded-full file:border-0 file:bg-[#111318] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-black"
          />
        </div>

        <div>
          <h4 className="mb-1 font-ui font-semibold text-[#242424]">Quality Control &amp; Validation</h4>
          <p className="mb-3 font-ui text-sm text-[#45545e]">Automated field quality check for non-mydriatic images</p>

          {quality ? (
            <ul className="space-y-2 rounded-xl bg-[#f5f5f5] p-4 font-ui text-sm text-[#242424]">
              <li className="flex justify-between">
                <span>Field Quality Score</span>
                <strong className="text-emerald-600">{quality.fieldQualityScore}%</strong>
              </li>
              <li className="flex justify-between">
                <span>Illumination &amp; Contrast</span>
                <strong className="text-emerald-600">{quality.illumination}</strong>
              </li>
              <li className="flex justify-between">
                <span>Macular Centering</span>
                <strong className="text-emerald-600">{quality.macularCentering}</strong>
              </li>
            </ul>
          ) : (
            <p className="font-ui text-sm text-[#8a8f98]">No image analyzed yet.</p>
          )}

          <button
            onClick={onRunDiagnostics}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#111318] py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
          >
            Run AI Diagnostics <ArrowRightIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}