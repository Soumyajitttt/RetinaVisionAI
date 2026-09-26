import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { getToken } from "../api/client";
import * as discussionsApi from "../api/discussions";

// Same backend origin DiscussionDetailPage already hardcodes for its own
// per-thread socket - kept in sync with that constant.
const SOCKET_URL = "http://localhost:5001";

const DiscussionNotificationsContext = createContext(null);

// Tracks "unread reply" state for every discussion the logged-in doctor is
// part of, live, from anywhere in the app - not just while a particular
// discussion thread is open. This is what lets the Sidebar's "Discussions"
// nav item and the DiscussionsPage list both show an up-to-date unread
// indicator without either of them owning the socket connection
// themselves.
//
// One socket per session (joined to the doctor's personal `user:<id>` room
// server-side - see backend/src/sockets/index.js), separate from
// DiscussionDetailPage's own socket which joins a specific discussion's
// room to receive live comments/typing while that thread is open.
export function DiscussionNotificationsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadByDiscussion, setUnreadByDiscussion] = useState({});
  const socketRef = useRef(null);

  const isDoctor = isAuthenticated && user?.role === "doctor";

  // Seed from the REST list (backend now computes unreadCount per
  // discussion - see discussionController.getMyDiscussions) whenever we
  // (re)become a logged-in doctor, then let socket events keep it fresh.
  useEffect(() => {
    if (!isDoctor) {
      setUnreadByDiscussion({});
      return;
    }
    let cancelled = false;
    discussionsApi
      .getMyDiscussions()
      .then((discussions) => {
        if (cancelled) return;
        const initial = {};
        discussions.forEach((d) => {
          initial[d.id] = d.unreadCount || 0;
        });
        setUnreadByDiscussion(initial);
      })
      .catch(() => {
        // Non-fatal - the badge just stays empty until a live event or a
        // page revisit refreshes it.
      });
    return () => {
      cancelled = true;
    };
  }, [isDoctor]);

  useEffect(() => {
    if (!isDoctor) return undefined;

    const socket = io(SOCKET_URL, { auth: { token: getToken() } });
    socketRef.current = socket;

    socket.on("discussion:unread", ({ discussionId, unreadCount }) => {
      setUnreadByDiscussion((prev) => ({ ...prev, [discussionId]: unreadCount }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isDoctor]);

  // Called by DiscussionDetailPage once a thread has been read (on load,
  // and again whenever a new reply streams in while it's still open) so
  // the badge clears immediately rather than waiting for a fresh fetch.
  function markRead(discussionId) {
    setUnreadByDiscussion((prev) => {
      if (!prev[discussionId]) return prev;
      return { ...prev, [discussionId]: 0 };
    });
  }

  const totalUnread = Object.values(unreadByDiscussion).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <DiscussionNotificationsContext.Provider value={{ unreadByDiscussion, totalUnread, markRead }}>
      {children}
    </DiscussionNotificationsContext.Provider>
  );
}

export function useDiscussionNotifications() {
  const ctx = useContext(DiscussionNotificationsContext);
  if (!ctx) throw new Error("useDiscussionNotifications must be used within a DiscussionNotificationsProvider");
  return ctx;
}