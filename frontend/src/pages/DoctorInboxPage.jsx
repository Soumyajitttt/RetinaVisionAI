import { useEffect, useState } from "react";
import FadeIn from "../components/FadeIn";
import GradeBadge from "../components/GradeBadge";
import PatientReportCard from "../components/PatientReportCard";
import DiscussModal from "../components/modals/DiscussModal";
import { useAuth } from "../context/AuthContext";
import * as referralsApi from "../api/referrals";

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function ReferralCard({ referral }) {
  const [expanded, setExpanded] = useState(false);
  const [discussOpen, setDiscussOpen] = useState(false);
  const { patient, analysis } = referral;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-[#f8f8f8]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#efeff0] font-ui font-bold text-[#010110]">
            {(patient?.name || referral.patientName || "?")
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <h3 className="font-ui font-semibold text-[#010110]">
              {patient?.name || referral.patientName}{" "}
              <span className="font-normal text-[#45545e]">({referral.patientId})</span>
            </h3>
            <p className="font-ui text-sm text-[#45545e]">
              Referred {formatDate(referral.referredAt)} by {referral.referredByName || "a PHC clinician"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {analysis?.gradeText && <GradeBadge grade={analysis.grade} gradeText={analysis.gradeText} />}
          <span className="font-ui text-sm text-[#8a8f98]">{expanded ? "Hide \u2191" : "View \u2193"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-black/[0.06] p-6">
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
        </div>
      )}

      <DiscussModal
        open={discussOpen}
        onClose={() => setDiscussOpen(false)}
        patientId={referral.patientId}
        patientName={patient?.name || referral.patientName}
      />
    </div>
  );
}

export default function DoctorInboxPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <FadeIn>
      <section>
        <div className="mb-5 rounded-2xl bg-white p-4 border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h2 className="font-display text-lg font-medium text-[#010110]">My Patients</h2>
          <p className="font-ui text-sm text-[#45545e]">
            Patients referred to {user?.name || "you"}{user?.facility ? ` at ${user.facility}` : ""} by PHC
            clinicians. Tap a patient to see their full screening report.
          </p>
        </div>

        {loading && <p className="font-ui text-sm text-[#45545e]">Loading your referrals...</p>}
        {error && <p className="font-ui text-sm text-red-600">{error}</p>}

        {!loading && !error && referrals.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <p className="font-ui text-sm text-[#45545e]">
              No patients have been referred to you yet. Once a PHC clinician sends you a referral, it'll
              show up here with the full report.
            </p>
          </div>
        )}

        {referrals.map((r) => (
          <ReferralCard key={r.id} referral={r} />
        ))}
      </section>
    </FadeIn>
  );
}