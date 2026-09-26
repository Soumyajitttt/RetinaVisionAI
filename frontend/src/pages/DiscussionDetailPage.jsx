import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import FadeIn from "../components/FadeIn";
import PatientReportCard from "../components/PatientReportCard";
import { useAuth } from "../context/AuthContext";
import { useDiscussionNotifications } from "../context/DiscussionNotificationsContext";
import { usePageHeader } from "../context/PageHeaderContext";
import * as discussionsApi from "../api/discussions";
import { getToken } from "../api/client";

// Same backend origin FundusAnalyzer.jsx already hardcodes as API_BASE -
// Socket.IO needs a full URL (unlike apiFetch's relative "/api/..." paths)
// since a WebSocket upgrade isn't something Vite's dev proxy carries the
// same way. Update alongside API_BASE if the backend ever moves.
const SOCKET_URL = "http://localhost:5001";

// Video calls run on Jitsi Meet (meet.jit.si) rather than a Google Meet
// link: a real Meet link can only be minted via the Google Calendar API,
// which needs every doctor to go through a "Sign in with Google" OAuth
// flow and the backend to store/refresh their tokens - infrastructure this
// project doesn't have yet. Jitsi needs none of that: any URL of the form
// meet.jit.si/<room-name> is instantly a working room for whoever opens
// it, with no account, API key, or backend call required. The room name
// is derived from the discussion's own id, so both doctors land in
// exactly the same room just by clicking the button on their own screens
// - nothing to type or share.
function videoRoomUrl(discussionId) {
  return `https://meet.jit.si/RetinaVisionAI-Discussion-${discussionId}`;
}

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
    " \u00b7 " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function DiscussionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Backend marks this thread read server-side on every GET (see
  // discussionController.getDiscussion), but the sidebar/list badge is
  // driven by this shared context's own state - clear it here too so it
  // doesn't wait for a fresh fetch to catch up.
  const { markRead: markReadLocally } = useDiscussionNotifications();
  const { setTitle: setHeaderTitle, setAction } = usePageHeader();

  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [reportOpen, setReportOpen] = useState(true);
  const [typingName, setTypingName] = useState(null);

  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  function load() {
    setLoading(true);
    discussionsApi
      .getDiscussion(id)
      // The backend now embeds `patient` and `analysis` directly on the
      // discussion object (see discussionController.getDiscussion) -
      // doctor accounts have no access to /api/patients or /api/analysis
      // directly, so this embedding is the only way the report reaches
      // this page. No separate fetch needed.
      .then((data) => {
        setDiscussion(data);
        // Opening the thread already marked it read server-side - reflect
        // that immediately in the shared badge state too.
        markReadLocally(id);
      })
      .catch((err) => setError(err.message || "Failed to load discussion"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Real-time chat: the REST addComment call remains the single source of
  // truth for actually saving a comment (see api/discussions.js) - this
  // socket is purely so everyone ELSE currently viewing the same
  // discussion sees it appear live, without polling. The backend re-checks
  // that this doctor is actually a participant before letting the socket
  // join the room (see backend/src/sockets/index.js), same as every REST
  // route already does.
  useEffect(() => {
    if (!id) return undefined;

    const socket = io(SOCKET_URL, { auth: { token: getToken() } });
    socketRef.current = socket;

    socket.emit("discussion:join", id, (ack) => {
      if (ack?.error) setError(ack.error);
    });

    socket.on("discussion:comment", (comment) => {
      // Dedupe by id: the poster's own tab already has this comment from
      // the REST response, and this same broadcast reaches their socket
      // too since they're in the room - so skip it if it's already there.
      setDiscussion((prev) => {
        if (!prev || prev.comments.some((c) => c.id === comment.id)) return prev;
        return { ...prev, comments: [...prev.comments, comment] };
      });

      // A reply from the OTHER doctor arriving while this thread is
      // already open counts as read on arrival - tell the backend (so the
      // unread indicator doesn't reappear next visit) and clear the local
      // badge state right away. The poster's own broadcast of their own
      // comment is skipped above by the dedupe check, so this only ever
      // fires for genuinely new incoming replies.
      if (comment.authorId !== user?.id) {
        discussionsApi.markRead(id).catch(() => {});
        markReadLocally(id);
      }
    });

    socket.on("discussion:typing", ({ authorName, isTyping }) => {
      setTypingName(isTyping ? authorName : null);
    });

    return () => {
      socket.emit("discussion:leave", id);
      socket.disconnect();
      socketRef.current = null;
      clearTimeout(typingTimeoutRef.current);
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discussion?.comments?.length]);

  // Swaps Topbar's default "Discussion" MAIN HEADER for this thread's own
  // "Re: <patient> · with <doctor>" line while this page is open, and puts
  // the default back the moment it isn't (route change or unmount) - see
  // PageHeaderContext. Derived as a plain string (not read straight off
  // `discussion` in the effect) so re-running the effect on every new
  // comment - which produces a new `discussion` object but the same
  // patient/doctor names - doesn't reset-then-reset Topbar's text on every
  // message.
  const headerTitle = discussion
    ? `${discussion.startedBy === user?.id ? "To" : "From"} 
      ${
        discussion.startedBy === user?.id
          ? discussion.invitedDoctorName
          : discussion.startedByName
      }`
    : null;

  useEffect(() => {
    if (!headerTitle) return undefined;
    setHeaderTitle(headerTitle);
    return () => setHeaderTitle(null);
  }, [headerTitle, setHeaderTitle]);

  // "Start Video Call" now lives in Topbar's top-right corner (see
  // PageHeaderContext/Topbar) instead of inline in the card below, so it's
  // set here the same way headerTitle is, and cleared again on unmount.
  useEffect(() => {
    if (!discussion) return undefined;
    setAction(
      <a
        href={videoRoomUrl(discussion.id)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
      >
        Start Video Call
      </a>
    );
    return () => setAction(null);
  }, [discussion, setAction]);

  function handleTextChange(e) {
    setText(e.target.value);
    const socket = socketRef.current;
    if (!socket) return;
    // Debounced typing indicator: tell the room "typing" on every
    // keystroke, then "stopped" after 1.5s of no further keystrokes.
    socket.emit("discussion:typing", { discussionId: id, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("discussion:typing", { discussionId: id, isTyping: false });
    }, 1500);
  }

  async function handlePost(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      // addComment's response also has patient/analysis embedded, so this
      // replace keeps the report visible instead of wiping it out.
      const updated = await discussionsApi.addComment(id, text.trim());
      setDiscussion(updated);
      setText("");
      clearTimeout(typingTimeoutRef.current);
      socketRef.current?.emit("discussion:typing", { discussionId: id, isTyping: false });
    } catch (err) {
      setError(err.message || "Failed to post comment");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <FadeIn>
        <p className="font-ui text-sm text-[#45545e]">Loading discussion...</p>
      </FadeIn>
    );
  }

  if (error && !discussion) {
    return (
      <FadeIn>
        <section className="rounded-2xl bg-white p-6 text-center border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <p className="mb-4 font-ui text-sm text-red-600">{error}</p>
          <button
            onClick={() => navigate("/discussions")}
            className="flex items-center gap-1.5 rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
          >
            <ArrowLeftIcon className="size-4" /> Back to Discussions
          </button>
        </section>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <section>
        <button
          onClick={() => navigate("/discussions")}
          className="mb-2.5 flex items-center gap-1.5 font-ui text-sm font-medium text-[#45545e] transition hover:text-[#010110]"
        >
          <ArrowLeftIcon className="size-4" /> Back to Discussions
        </button>

        {/* One unified card, now a single row: the subject text doubles as
            the row's title (no separate "Patient Report" label sitting
            right under it), and the whole row toggles the report below -
            the right-hand control now reads "View/Hide Patient Report" so
            it's still clear what it opens. */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <button
            onClick={() => setReportOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#f8f8f8]"
          >
            <h2 className="font-display text-lg font-medium text-[#010110]">{discussion.subject}</h2>
            <span className="flex shrink-0 items-center gap-1 font-ui text-sm text-[#8a8f98]">
              {reportOpen ? "Hide Patient Report" : "View Patient Report"}
              {reportOpen ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
            </span>
          </button>
          {reportOpen && (
            <div className="border-t border-black/[0.06] p-6">
              <PatientReportCard patient={discussion.patient} analysis={discussion.analysis} />
            </div>
          )}
        </div>

        {/* Chat + composer grouped into one card (previously a scrolling
            message list, error/typing lines, and the reply form each sat as
            separate elements) - the message area also gets a deeper
            background than plain white so it reads as its own "conversation
            surface" distinct from the composer bar beneath it. */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="max-h-[55vh] space-y-3 overflow-y-auto bg-[#eef0f2] p-5">
            {discussion.comments.length === 0 && (
              <p className="font-ui text-sm text-[#8a8f98]">
                No replies yet - be the first to respond below.
              </p>
            )}
            {discussion.comments.map((c) => {
              const isMine = c.authorId === user?.id;
              return (
                <div key={c.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMine ? "bg-[#111318] text-white" : "bg-white text-[#010110]"
                    }`}
                  >
                    <p className={`mb-0.5 font-ui text-xs font-semibold ${isMine ? "text-white/60" : "text-[#45545e]"}`}>
                      {isMine ? "You" : c.authorName} &middot; {formatDateTime(c.createdAt)}
                    </p>
                    <p className="font-ui text-sm leading-relaxed">{c.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-black/[0.06] p-4">
            {error && <p className="mb-2 font-ui text-sm text-red-600">{error}</p>}
            {typingName && (
              <p className="mb-2 font-ui text-xs italic text-[#8a8f98]">{typingName} is typing&hellip;</p>
            )}

            <form onSubmit={handlePost} className="flex gap-2">
              <input
                type="text"
                value={text}
                onChange={handleTextChange}
                placeholder="Write a reply..."
                className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 font-ui text-sm text-[#010110] placeholder:text-[#8a8f98] focus:border-[#010110] focus:outline-none focus:ring-1 focus:ring-[#010110]/15"
              />
              <button
                type="submit"
                disabled={posting || !text.trim()}
                className="rounded-full bg-[#111318] px-5 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}