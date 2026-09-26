import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageHeader } from "../context/PageHeaderContext";

const TITLES = {
  "/database": "Patient Database",
  "/report": "Screening & Analysis",
  "/grading": "Diagnostic AI & Grad-CAM",
  "/pdf-report": "Report Preview",
  "/specialists": "Nearest Specialists",
  "/referrals": "Referral History",
  "/doctor": "My Patients",
  "/discussions": "Discussions"
};

export default function Topbar() {
  const location = useLocation();
  const { isAuthenticated, user, openAuthModal } = useAuth();
  // Set by DiscussionDetailPage (and cleared again on unmount) to swap the
  // thread-specific "Re: <patient> · with <doctor>" line in as the MAIN
  // header, in place of the generic per-route title below. Null on every
  // other page, and `subtitle` is left unused for now (available for a
  // future page that wants to override just the line underneath instead).
  const { title: titleOverride, action } = usePageHeader();

  const title =
    titleOverride ||
    TITLES[location.pathname] ||
    (location.pathname.startsWith("/discussions/") ? "Discussion" : "RetinaVision AI");

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white/80 px-6 py-3.5 backdrop-blur print:hidden">
      <h1 className="font-display text-xl font-medium text-[#010110]">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Per-page action (e.g. DiscussionDetailPage's "Start Video Call"
            button) rendered here in the top-right corner. When a page sets
            one, it takes the place of "Signed in as ..." rather than
            sitting next to it - the action is the more useful thing to
            show in that spot while it's available. */}
        {action}

        {!isAuthenticated && (
          <button
            onClick={() => openAuthModal("login")}
            className="rounded-full border border-black/15 px-4 py-1.5 font-ui text-sm font-medium text-[#242424] transition-colors hover:bg-[#f5f5f2]"
          >
            Login / Register
          </button>
        )}
        {isAuthenticated && !action && (
          <span className="hidden font-ui text-sm text-[#45545e] sm:inline">Signed in as {user?.name}</span>
        )}
      </div>
    </header>
  );
}