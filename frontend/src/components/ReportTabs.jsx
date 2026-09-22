const TABS = [
  { key: "analysis", label: "Analysis" },
  { key: "results", label: "Result / Grading" },
  { key: "report", label: "Report" }
];

export default function ReportTabs({ activeTab, onChange }) {
  return (
    <div className="mb-6 flex gap-1 border-b-2 border-black/10">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          aria-selected={activeTab === tab.key}
          onClick={() => onChange(tab.key)}
          className={`-mb-0.5 border-b-2 px-4 py-2.5 font-ui text-sm font-semibold transition-colors ${
            activeTab === tab.key
              ? "border-[#010110] text-[#010110]"
              : "border-transparent text-[#8a8f98] hover:text-[#45545e]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
