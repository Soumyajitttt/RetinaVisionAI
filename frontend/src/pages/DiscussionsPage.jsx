import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRightIcon, ArrowDownLeftIcon } from "@heroicons/react/24/outline";
import FadeIn from "../components/FadeIn";
import { useAuth } from "../context/AuthContext";
import * as discussionsApi from "../api/discussions";

function formatDateTime(iso) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " \u00b7 " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function DiscussionsPage() {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    discussionsApi
      .getMyDiscussions()
      .then((data) => {
        if (!cancelled) setDiscussions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load discussions");
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
        {/* <div className="mb-5 rounded-2xl bg-white p-4 border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h2 className="font-display text-lg font-medium text-[#010110]">Discussions</h2>
          <p className="font-ui text-sm text-[#45545e]">
            Consultations with other doctors about specific patients - either you started, or a
            colleague invited you into.
          </p>
        </div> */}

        {loading && <p className="font-ui text-sm text-[#45545e]">Loading discussions...</p>}
        {error && <p className="font-ui text-sm text-red-600">{error}</p>}

        {!loading && !error && discussions.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-center border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <p className="font-ui text-sm text-[#45545e]">
              No discussions yet. Open a patient under "My Patients" and tap "Discuss this patient" to
              start one.
            </p>
          </div>
        )}

        {discussions.map((d) => {
          const otherDoctor = d.startedBy === user?.id ? d.invitedDoctorName : d.startedByName;
          const youStarted = d.startedBy === user?.id;
          return (
            <Link
              key={d.id}
              to={`/discussions/${d.id}`}
              className="mb-3 flex items-center gap-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-black/10 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
            >
              <span
                title={youStarted ? "You started this discussion" : "You were invited to this discussion"}
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                  youStarted ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {youStarted ? (
                  <ArrowUpRightIcon className="size-4" />
                ) : (
                  <ArrowDownLeftIcon className="size-4" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-ui font-semibold text-[#010110]">{d.subject}</h3>
                <p className="font-ui text-sm text-[#45545e]">
                  {d.patientName} ({d.patientId}) &middot; {youStarted ? "with" : "invited by"}{" "}
                  {otherDoctor}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-ui text-xs text-[#8a8f98]">{formatDateTime(d.updatedAt)}</p>
                <p className="font-ui text-xs font-medium text-[#45545e]">
                  {d.commentCount} {d.commentCount === 1 ? "reply" : "replies"}
                </p>
              </div>
            </Link>
          );
        })}
      </section>
    </FadeIn>
  );
}