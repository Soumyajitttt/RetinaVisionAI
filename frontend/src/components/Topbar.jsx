import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  const title =
    TITLES[location.pathname] ||
    (location.pathname.startsWith("/discussions/") ? "Discussion" : "RetinaVision AI");
  const edition = user?.role === "doctor" ? "Doctor Edition" : "PHC Edition";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white/80 px-6 py-3.5 backdrop-blur print:hidden">
      <div>
        <h1 className="font-display text-base font-medium text-[#010110]">{title}</h1>
        <p className="font-ui text-xs text-[#8a8f98]">{edition} &middot; AI-assisted diabetic retinopathy screening</p>
      </div>

      {!isAuthenticated && (
        <button
          onClick={() => openAuthModal("login")}
          className="rounded-full border border-black/15 px-4 py-1.5 font-ui text-sm font-medium text-[#242424] transition-colors hover:bg-[#f5f5f2]"
        >
          Login / Register
        </button>
      )}
      {isAuthenticated && (
        <span className="hidden font-ui text-sm text-[#45545e] sm:inline">Signed in as {user?.name}</span>
      )}
    </header>
  );
}
