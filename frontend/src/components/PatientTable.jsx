import GradeBadge from "./GradeBadge";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

function PatientRow({ patient, onViewReport }) {
  const isGraded = patient.grade != null && patient.gradeText;

  return (
    <tr className="border-b border-black/5 last:border-0 hover:bg-[#f8f8f8]">
      <td className="px-4 py-3 font-ui font-semibold text-[#242424]">{patient.id}</td>
      <td className="px-4 py-3">
        <div className="font-ui font-medium text-[#010110]">{patient.name}</div>
        <div className="font-ui text-xs text-[#45545e]">
          {patient.age} Yrs • {patient.gender}
        </div>
      </td>
      <td className="px-4 py-3 font-ui text-sm text-[#45545e]">{patient.screenDate}</td>
      <td className="px-4 py-3">
        {isGraded ? (
          <GradeBadge grade={patient.grade} gradeText={patient.gradeText} />
        ) : (
          <span className="font-ui text-xs text-[#8a8f98]">Not analysed</span>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onViewReport(patient.id)}
          className="flex items-center gap-1 rounded-full border border-black/15 px-3 py-1 font-ui text-xs font-semibold text-[#010110] transition hover:bg-[#f5f5f2]"
        >
          View Report <ArrowRightIcon className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}

export default function PatientTable({ patients, onViewReport }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white border border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[#f5f5f5] font-ui text-xs font-semibold uppercase text-[#45545e]">
            <th className="px-4 py-3">Patient ID</th>
            <th className="px-4 py-3">Name &amp; Details</th>
            <th className="px-4 py-3">Screen Date</th>
            <th className="px-4 py-3">Grade</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <PatientRow key={p.id} patient={p} onViewReport={onViewReport} />
          ))}
          {patients.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center font-ui text-sm text-[#45545e]">
                No patients found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}