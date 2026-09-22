import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useApp, GRADE_LABELS } from "../context/AppContext";
import PatientTable from "../components/PatientTable";
import AddPatientModal from "../components/modals/AddPatientModal";
import FadeIn from "../components/FadeIn";

const GRADE_FILTERS = [
  { key: "all", label: "All Patients" },
  { key: "0", label: `Grade 0: Normal` },
  { key: "1", label: `Grade 1: Mild DR` },
  { key: "2", label: `Grade 2: Moderate DR` },
  { key: "3", label: `Grade 3: Severe DR` },
  { key: "4", label: `Grade 4: Proliferative DR` }
];

export default function DatabasePage() {
  const { patients, patientsLoading, patientsError, addPatient, setActivePatientId } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);

  const filteredPatients = useMemo(() => {
    let list = patients;

    if (gradeFilter !== "all") {
      list = list.filter((p) => p.grade === Number(gradeFilter));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.village.toLowerCase().includes(q)
      );
    }

    return list;
  }, [patients, gradeFilter, search]);

  function handleViewReport(patientId) {
    setActivePatientId(patientId);
    navigate("/report");
  }

  async function handleAddPatient(form) {
    try {
      await addPatient({ name: form.name, age: Number(form.age), gender: form.gender });
      setModalOpen(false);
    } catch (err) {
      alert(err.message || "Failed to add patient");
    }
  }

  return (
    <FadeIn>
    <section className="space-y-4">
      <div className="rounded-2xl bg-white p-4 border border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search patient name, ID, or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 max-w-full rounded-xl border border-black/10 bg-white px-3 py-2 font-ui text-sm text-[#010110] placeholder:text-[#8a8f98] focus:border-[#010110] focus:outline-none focus:ring-1 focus:ring-[#010110]/15"
          />

          <div className="relative">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              aria-label="Filter by grade"
              className="appearance-none rounded-xl border border-black/10 bg-white py-2 pl-3 pr-9 font-ui text-sm font-medium text-[#010110] focus:border-[#010110] focus:outline-none focus:ring-1 focus:ring-[#010110]/15"
            >
              {GRADE_FILTERS.map((filter) => (
                <option key={filter.key} value={filter.key}>
                  {filter.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]"
            />
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="ml-auto whitespace-nowrap rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
          >
            Add New
          </button>
        </div>
      </div>

      <div>
        {patientsLoading && <p className="mb-3 font-ui text-sm text-[#45545e]">Loading patients...</p>}
        {patientsError && <p className="mb-3 font-ui text-sm font-medium text-red-600">{patientsError}</p>}
        <PatientTable patients={filteredPatients} onViewReport={handleViewReport} />
      </div>

      <AddPatientModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleAddPatient} />
    </section>
    </FadeIn>
  );
}

// Re-exported for reference elsewhere if needed.
export { GRADE_LABELS };