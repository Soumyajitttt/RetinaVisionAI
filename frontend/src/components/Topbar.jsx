import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageHeader } from "../context/PageHeaderContext";
import { UserCircleIcon, ChevronDownIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

// Most pages carry their own big page-level heading now (see e.g.
// DoctorInboxPage's "My Patients" h1), so Topbar itself stays title-less
// by default. DiscussionDetailPage is the one exception: it still sets a
// title here (via PageHeaderContext) for its "From/To <doctor>" line,
// since that reads more like transient thread chrome than a page heading.
// Whenever that override is active, a back arrow precedes it here (rather
// than DiscussionDetailPage rendering its own "Back to Discussions" button
// inline) so the thread's own back navigation lives in the same header row
// as its title.
export default function Topbar() {
  const { isAuthenticated, user, openAuthModal } = useAuth();
  const { title: titleOverride, action } = usePageHeader();
  const navigate = useNavigate();

  // Same "first letter(s) of each word" initials DoctorInboxPage's
  // ReferralRow uses for its patient avatar circle - titleOverride is
  // always a person's name here (DiscussionDetailPage's From/To line), so
  // the same treatment applies.
  const titleInitials = titleOverride
    ? titleOverride
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
    : "";

  return (
    <header
      className={`sticky top-0 z-30 flex items-center border-b border-black/10 bg-white/80 px-6 py-2.5 backdrop-blur print:hidden ${
        titleOverride ? "justify-between" : "justify-end"
      }`}
    >
      {titleOverride && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/discussions")}
            aria-label="Back to Discussions"
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[#45545e] transition hover:bg-black/5 hover:text-[#010110]"
          >
            <ArrowLeftIcon className="size-3.5" />
          </button>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef2f6] font-ui text-[10px] font-semibold text-[#334155]">
            {titleInitials}
          </div>
          <h1 className="font-display text-sm font-medium text-[#010110]">{titleOverride}</h1>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Per-page action (e.g. DiscussionDetailPage's "Start Video Call"
            button). When a page sets one, it takes the place of the
            signed-in chip rather than sitting next to it - the action is
            the more useful thing to show in that spot while it's available. */}
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
          <button className="hidden items-center gap-1.5 rounded-full py-1 pl-1 pr-2 font-ui text-sm text-[#45545e] transition hover:bg-black/5 sm:flex">
            <UserCircleIcon className="size-6 text-[#8a8f98]" />
            <span>
              Signed in as <span className="font-semibold text-[#010110]">{user?.name}</span>
            </span>
          </button>
        )}
      </div>
    </header>
  );
}