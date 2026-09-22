import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FadeIn from "../components/FadeIn";
import PatientReportCard from "../components/PatientReportCard";
import { useAuth } from "../context/AuthContext";
import * as discussionsApi from "../api/discussions";

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

  const [discussion, setDiscussion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [reportOpen, setReportOpen] = useState(true);

  const bottomRef = useRef(null);

  function load() {
    setLoading(true);
    discussionsApi
      .getDiscussion(id)
      // The backend now embeds `patient` and `analysis` directly on the
      // discussion object (see discussionController.getDiscussion) -
      // doctor accounts have no access to /api/patients or /api/analysis
      // directly, so this embedding is the only way the report reaches
      // this page. No separate fetch needed.
      .then(setDiscussion)
      .catch((err) => setError(err.message || "Failed to load discussion"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [discussion?.comments?.length]);

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
            className="rounded-full bg-[#111318] px-4 py-2 font-ui text-sm font-semibold text-white transition hover:bg-black"
          >
            &larr; Back to Discussions
          </button>
        </section>
      </FadeIn>
    );
  }

  const otherDoctor = discussion.startedBy === user?.id ? discussion.invitedDoctorName : discussion.startedByName;

  return (
    <FadeIn>
      <section>
        <button
          onClick={() => navigate("/discussions")}
          className="mb-4 font-ui text-sm font-medium text-[#45545e] transition hover:text-[#010110]"
        >
          &larr; Back to Discussions
        </button>

        <div className="mb-5 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <h2 className="font-display text-lg font-medium text-[#010110]">{discussion.subject}</h2>
          <p className="font-ui text-sm text-[#45545e]">
            Re: <strong>{discussion.patientName}</strong> ({discussion.patientId}) &middot; with{" "}
            {otherDoctor}
          </p>
        </div>

        {/* The actual report the discussion is about - embedded by the
            backend on every GET/POST to this discussion. */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <button
            onClick={() => setReportOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[#f8f8f8]"
          >
            <h3 className="font-display text-base font-medium text-[#010110]">Patient Report</h3>
            <span className="font-ui text-sm text-[#8a8f98]">{reportOpen ? "Hide \u2191" : "View \u2193"}</span>
          </button>
          {reportOpen && (
            <div className="border-t border-black/[0.06] p-6">
              <PatientReportCard patient={discussion.patient} analysis={discussion.analysis} />
            </div>
          )}
        </div>

        <div className="mb-4 max-h-[55vh] space-y-3 overflow-y-auto rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
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
                    isMine ? "bg-[#111318] text-white" : "bg-[#f0f0ee] text-[#010110]"
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

        {error && <p className="mb-2 font-ui text-sm text-red-600">{error}</p>}

        <form onSubmit={handlePost} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
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
      </section>
    </FadeIn>
  );
}