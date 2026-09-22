import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  // Rendered via a portal straight into <body> so this always sits in the
  // root stacking context - otherwise a modal mounted under any sticky or
  // transformed ancestor (e.g. the sidebar) gets trapped inside that
  // ancestor's stacking context and can be painted under other elements
  // (like the sticky Topbar) despite its high z-index.
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
        <div className="mb-4 flex items-center justify-between border-b border-black/5 pb-3">
          <h3 className="font-display text-lg font-medium text-[#010110]">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#8a8f98] transition-colors hover:text-[#010110]"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}