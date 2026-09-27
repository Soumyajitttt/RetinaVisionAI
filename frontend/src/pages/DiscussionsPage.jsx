import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRightIcon, ArrowDownLeftIcon } from "@heroicons/react/24/outline";
import FadeIn from "../components/FadeIn";
import { useAuth } from "../context/AuthContext";
import { useDiscussionNotifications } from "../context/DiscussionNotificationsContext";
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
  // Per-discussion unread counts are seeded from the REST list below, but
  // kept live here too via the shared socket in DiscussionNotificationsContext
  // - so a reply that arrives while this list is already on screen lights
  // up the row immediately, no refresh needed.
  const { unreadByDiscussion } = useDiscussionNotifications();
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
        <h1 className="mb-5 font-display text-[28px] font-semibold tracking-tight text-[#0a0e14]">Discussions</h1>

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
          // Live count takes priority over the one from the initial fetch,
          // falling back to it until the first socket event (or a full
          // page load) has a chance to seed unreadByDiscussion.
          const unreadCount = unreadByDiscussion[d.id] ?? d.unreadCount ?? 0;
          const isUnread = unreadCount > 0;
          return (
            <Link
              key={d.id}
              to={`/discussions/${d.id}`}
              className={`mb-3 flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-black/10 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)] ${
                isUnread ? "border-blue-200 bg-blue-50/40" : "border-black/[0.06]"
              }`}
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
                <div className="flex items-center gap-2">
                  {isUnread && (
                    <span
                      title={`${unreadCount} unread ${unreadCount === 1 ? "reply" : "replies"}`}
                      className="size-2 shrink-0 rounded-full bg-blue-600"
                    />
                  )}
                  <h3
                    className={`truncate font-ui ${
                      isUnread ? "font-bold text-[#010110]" : "font-semibold text-[#010110]"
                    }`}
                  >
                    {d.subject}
                  </h3>
                </div>
                <p className="font-ui text-sm text-[#45545e]">
                  {d.patientName} ({d.patientId}) &middot; {youStarted ? "to" : "from"}{" "}
                  {otherDoctor}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-ui text-xs text-[#8a8f98]">{formatDateTime(d.updatedAt)}</p>
                {isUnread ? (
                  <span className="mt-0.5 inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 font-ui text-xs font-semibold text-white">
                    {unreadCount} new
                  </span>
                ) : (
                  <p className="font-ui text-xs font-medium text-[#45545e]">
                    {d.commentCount} {d.commentCount === 1 ? "reply" : "replies"}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </section>
    </FadeIn>
  );
}