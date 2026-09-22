import { useEffect, useState } from "react";
import FadeIn from "../components/FadeIn";
import * as referralsApi from "../api/referrals";

const STATUS_STYLES = {
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  skipped: "bg-[#f5f5f2] text-[#45545e] border-black/10"
};

const STATUS_LABEL = {
  sent: "Emailed",
  failed: "Email failed",
  skipped: "Not emailed"
};

function StatusPill({ status }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.skipped;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-ui text-xs font-medium ${cls}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }) + " " + new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function ReferralHistoryPage() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    referralsApi
      .getReferralHistory()
      .then((data) => {
        if (!cancelled) setReferrals(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load referral history");
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
          <h2 className="font-display text-lg font-medium text-[#010110]">Referral History</h2>
          <p className="font-ui text-sm text-[#45545e]">
            Every patient referred to a specialist, with the date and email delivery status.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white border border-black/6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f5f5f5] font-ui text-xs font-semibold uppercase text-[#45545e]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">Patient ID</th>
                <th className="px-4 py-3">Referred To</th>
                <th className="px-4 py-3">Facility</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0 hover:bg-[#f8f8f8]">
                  <td className="px-4 py-3 font-ui text-sm text-[#45545e]">{formatDate(r.referredAt)}</td>
                  <td className="px-4 py-3 font-ui font-medium text-[#010110]">{r.patientName}</td>
                  <td className="px-4 py-3 font-ui font-semibold text-[#242424]">{r.patientId}</td>
                  <td className="px-4 py-3 font-ui text-sm text-[#242424]">{r.specialistName}</td>
                  <td className="px-4 py-3 font-ui text-sm text-[#45545e]">{r.specialistFacility}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.emailStatus} />
                  </td>
                </tr>
              ))}
              {!loading && referrals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center font-ui text-sm text-[#45545e]">
                    No referrals sent yet.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center font-ui text-sm text-[#45545e]">
                    Loading referral history...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error && <p className="mt-3 font-ui text-sm text-red-600">{error}</p>}
      </section>
    </FadeIn>
  );
}

