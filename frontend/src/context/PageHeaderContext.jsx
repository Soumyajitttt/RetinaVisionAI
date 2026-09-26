import { createContext, useContext, useState } from "react";

const PageHeaderContext = createContext(null);

// Lets a page override the pieces of Topbar's header - normally a static
// per-route title (from Topbar's own TITLES map) plus a subtitle line like
// "Doctor Edition · AI-assisted diabetic retinopathy screening" - with
// something more specific to what's actually on screen. e.g.
// DiscussionDetailPage sets `title` to "Re: <patient> (<id>) · with <other
// doctor>" in place of the generic "Discussion" while that thread is open,
// then clears it again on unmount so every other page keeps its default
// title. `subtitle` works the same way for the line underneath, for
// whichever page needs that instead/as well.
export function PageHeaderProvider({ children }) {
  const [title, setTitle] = useState(null);
  const [subtitle, setSubtitle] = useState(null);
  // Lets a page render something (e.g. a "Start Video Call" button) into
  // Topbar's own top-right corner, next to/above the "Signed in as ..."
  // line, instead of having to build that action into the page body itself.
  const [action, setAction] = useState(null);

  return (
    <PageHeaderContext.Provider value={{ title, setTitle, subtitle, setSubtitle, action, setAction }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error("usePageHeader must be used within a PageHeaderProvider");
  return ctx;
}