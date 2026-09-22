import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  TableCellsIcon,
  EyeIcon,
  CpuChipIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import Modal from "./modals/Modal";

const PHC_NAV_ITEMS = [
  { to: "/database", label: "Patient Database", icon: TableCellsIcon },
  { to: "/report", label: "Screening & Analysis", icon: EyeIcon },
  { to: "/grading", label: "Diagnostic AI", icon: CpuChipIcon },
  { to: "/pdf-report", label: "Report Preview", icon: DocumentTextIcon },
  { to: "/specialists", label: "Specialists", icon: UserGroupIcon },
  { to: "/referrals", label: "Referral History", icon: ClockIcon }
];

const DOCTOR_NAV_ITEMS = [
  { to: "/doctor", label: "My Patients", icon: UserIcon },
  { to: "/discussions", label: "Discussions", icon: ChatBubbleLeftRightIcon }
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const { user, logout } = useAuth();
  const navItems = user?.role === "doctor" ? DOCTOR_NAV_ITEMS : PHC_NAV_ITEMS;

  function handleConfirmLogout() {
    setConfirmLogoutOpen(false);
    logout(); // AuthContext.logout() also redirects to the landing page
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/10 bg-[#17171a] text-white transition-[width] duration-200 ease-in-out print:hidden ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="RetinaVision AI home">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
            <HomeIcon className="size-[18px]" />
          </span>
          {!collapsed && (
            <span className="truncate font-display text-[15px] font-medium text-white">RetinaVision AI</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Primary">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 font-ui text-sm font-medium transition-colors ${
                isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon className="size-[19px] shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2">
        {!collapsed && (
          <div className="mb-1 px-2 py-2">
            <p className="truncate font-ui text-sm font-medium text-white">{user?.name || "Clinician"}</p>
            <p className="truncate font-ui text-xs text-white/40">
              {user?.id}
              {user?.role === "doctor" && <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Doctor</span>}
            </p>
          </div>
        )}

        <button
          onClick={() => setConfirmLogoutOpen(true)}
          title="Logout"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-ui text-sm font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowRightOnRectangleIcon className="size-[19px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-ui text-sm font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <ChevronDoubleRightIcon className="size-[19px]" /> : <ChevronDoubleLeftIcon className="size-[19px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      <Modal
        open={confirmLogoutOpen}
        title="Log out?"
        onClose={() => setConfirmLogoutOpen(false)}
      >
        <p className="mb-5 font-ui text-sm text-[#45545e]">
          You'll be signed out and returned to the home page. Any unsaved changes may be lost.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmLogoutOpen(false)}
            className="rounded-full border border-black/15 px-4 py-2 font-ui text-sm font-medium text-[#242424] transition hover:bg-[#f5f5f2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            className="flex items-center gap-1.5 rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
          >
            <ArrowRightOnRectangleIcon className="size-4" />
            Log out
          </button>
        </div>
      </Modal>
    </aside>
  );
}