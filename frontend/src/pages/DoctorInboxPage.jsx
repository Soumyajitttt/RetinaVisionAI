import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import FadeIn from "../components/FadeIn";
import GradeBadge from "../components/GradeBadge";
import PatientReportCard from "../components/PatientReportCard";
import DiscussModal from "../components/modals/DiscussModal";
import { useAuth } from "../context/AuthContext";
import * as referralsApi from "../api/referrals";

// Same grade filter set DatabasePage.jsx uses for the PHC patient
// database - kept identical here so both portals filter by grade the
// same way.
const GRADE_FILTERS = [
  { key: "all", label: "All Patients" },
  { key: "0", label: "Grade 0: Normal" },
  { key: "1", label: "Grade 1: Mild DR" },
  { key: "2", label: "Grade 2: Moderate DR" },
  { key: "3", label: "Grade 3: Severe DR" },
  { key: "4", label: "Grade 4: Proliferative DR" }
];

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// One referral, rendered as a table row - expands in place (a second
// <tr> with a colSpan'd <td>) into the full patient report + "Discuss
// this patient" action, exactly what the old card-based layout showed,
// just laid out as a table like PatientTable.jsx instead of a stack of
// cards.
function ReferralRow({ referral, expanded, onToggle }) {
  const [discussOpen, setDiscussOpen] = useState(false);
  const { patient, analysis } = referral;
  const isGraded = analysis?.grade != null && analysis?.gradeText;

  const initials = (patient?.name || referral.patientName || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <Fragment>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-black/5 last:border-0 hover:bg-[#f8f8f8]"
      >
        <td className="px-4 py-3 font-ui font-semibold text-[#242424]">{referral.patientId}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#efeff0] font-ui text-xs font-bold text-[#010110]">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate font-ui font-medium text-[#010110]">
                {patient?.name || referral.patientName}
              </div>
              {patient?.age != null && patient?.gender && (
                <div className="font-ui text-xs text-[#45545e]">
                  {patient.age} Yrs &middot; {patient.gender}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 font-ui text-sm text-[#45545e]">
          {formatDate(referral.referredAt)}
          <div className="font-ui text-xs text-[#8a8f98]">by {referral.referredByName || "a PHC clinician"}</div>
        </td>
        <td className="px-4 py-3">
          {isGraded ? (
            <GradeBadge grade={analysis.grade} gradeText={analysis.gradeText} />
          ) : (
            <span className="font-ui text-xs text-[#8a8f98]">Not analysed</span>
          )}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex items-center gap-1 rounded-full border border-black/15 px-3 py-1 font-ui text-xs font-semibold text-[#010110] transition hover:bg-[#f5f5f2]"
          >
            {expanded ? "Hide" : "View"}
            {expanded ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-black/5 last:border-0">
          <td colSpan={5} className="bg-[#fbfbfb] p-6">
            <PatientReportCard patient={patient} analysis={analysis} />

            <div className="mt-5 border-t border-black/10 pt-4">
              <button
                onClick={() => setDiscussOpen(true)}
                className="rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
              >
                Discuss this patient
              </button>
              <p className="mt-1.5 font-ui text-xs text-[#8a8f98]">
                Invite another doctor to weigh in - opens a thread under Discussions.
              </p>
            </div>
          </td>
        </tr>
      )}

      <DiscussModal
        open={discussOpen}
        onClose={() => setDiscussOpen(false)}
        patientId={referral.patientId}
        patientName={patient?.name || referral.patientName}
      />
    </Fragment>
  );
}

export default function DoctorInboxPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    referralsApi
      .getMyReferrals()
      .then((data) => {
        if (!cancelled) setReferrals(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load your referrals");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredReferrals = useMemo(() => {
    let list = referrals;

    if (gradeFilter !== "all") {
      list = list.filter((r) => r.analysis?.grade === Number(gradeFilter));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        const name = (r.patient?.name || r.patientName || "").toLowerCase();
        const id = (r.patientId || "").toLowerCase();
        const referredBy = (r.referredByName || "").toLowerCase();
        return name.includes(q) || id.includes(q) || referredBy.includes(q);
      });
    }

    return list;
  }, [referrals, gradeFilter, search]);

  return (
    <FadeIn>
      <section className="space-y-4">
        <div className="rounded-2xl bg-white p-4 border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {/* <p className="mb-3 font-ui text-sm text-[#45545e]">
            Patients referred to {user?.name || "you"}
            {user?.facility ? ` at ${user.facility}` : ""} by PHC clinicians. Tap a patient to see their
            full screening report.
          </p> */}

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search patient name, ID, or referring clinician..."
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
          </div>
        </div>

        {loading && <p className="font-ui text-sm text-[#45545e]">Loading your referrals...</p>}
        {error && <p className="font-ui text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl bg-white border border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[12%]" />
                <col className="w-[30%]" />
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="bg-[#f5f5f5] font-ui text-xs font-semibold uppercase text-[#45545e]">
                  <th className="px-4 py-3">Patient ID</th>
                  <th className="px-4 py-3">Name &amp; Details</th>
                  <th className="px-4 py-3">Referred</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((r) => (
                  <ReferralRow
                    key={r.id}
                    referral={r}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
                  />
                ))}
                {filteredReferrals.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center font-ui text-sm text-[#45545e]">
                      {referrals.length === 0
                        ? "No patients have been referred to you yet. Once a PHC clinician sends you a referral, it'll show up here with the full report."
                        : "No patients found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </FadeIn>
  );
}