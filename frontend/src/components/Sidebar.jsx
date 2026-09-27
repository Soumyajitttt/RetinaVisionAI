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
import { useDiscussionNotifications } from "../context/DiscussionNotificationsContext";
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
  const { totalUnread } = useDiscussionNotifications();
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
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="RetinaVision AI home">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
            <HomeIcon className="size-4" />
          </span>
          {!collapsed && (
            <span className="truncate font-display text-[15px] font-medium text-white">RetinaVision AI</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Primary">
        {navItems.map(({ to, label, icon: Icon }) => {
          // Only the Discussions nav item ever carries a badge - unread
          // replies, live, from DiscussionNotificationsContext's socket
          // (see that file for how it stays in sync from anywhere in the
          // app, not just while a thread is actually open).
          const showBadge = to === "/discussions" && totalUnread > 0;
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? (showBadge ? `${label} (${totalUnread} unread)` : label) : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-ui text-sm font-medium transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <span className="relative shrink-0">
                <Icon className="size-[19px]" />
                {showBadge && collapsed && (
                  <span className="absolute -right-1 -top-1 flex size-2 rounded-full bg-red-500" />
                )}
              </span>
              {!collapsed && (
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="truncate">{label}</span>
                  {showBadge && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500 font-ui text-[11px] font-semibold text-white">
                      {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2.5 px-2 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70">
              <UserIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-ui text-sm font-medium text-white">{user?.name || "Clinician"}</p>
              <p className="truncate font-ui text-xs text-white/40">
                {user?.id}
                {user?.role === "doctor" && <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Doctor</span>}
              </p>
            </div>
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