import { useState } from "react";
import { useApp } from "../context/AppContext";
import SpecialistCard from "../components/SpecialistCard";
import FadeIn from "../components/FadeIn";

export default function SpecialistsPage() {
  const { specialists, activePatient, sendReferral } = useApp();
  // Per-specialist send state so clicking one card's "Send" doesn't affect
  // the others: { [specialistId]: "sending" | "sent" | "logged" | "failed" }
  const [sendStatus, setSendStatus] = useState({});

  function setStatus(id, status) {
    setSendStatus((prev) => ({ ...prev, [id]: status }));
  }

  async function handleSend(specialist) {
    setStatus(specialist.id, "sending");
    try {
      const { message, referral } = await sendReferral(specialist.id);
      // "sent" = email actually delivered; anything else means the referral
      // was still logged, just without a successful email (see alert).
      setStatus(specialist.id, referral?.emailStatus === "sent" ? "sent" : "logged");
      alert(message);
    } catch (err) {
      setStatus(specialist.id, "failed");
      alert(err.message || `Failed to send referral to ${specialist.name}`);
    } finally {
      setTimeout(() => setStatus(specialist.id, "idle"), 4000);
    }
  }

  return (
    <FadeIn>
    <section>
      <div className="mb-5">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-[#0a0e14]">Nearest Specialists</h1>
        <p className="mt-1 font-ui text-sm text-[#45545e]">
          Refer patients directly to regional ophthalmology partners
          {activePatient ? ` for ${activePatient.name} (${activePatient.id})` : ""}
        </p>
      </div>

      <div>
        {specialists.map((specialist) => (
          <SpecialistCard
            key={specialist.id}
            specialist={specialist}
            onSend={handleSend}
            status={sendStatus[specialist.id] || "idle"}
          />
        ))}
        {specialists.length === 0 && <p className="font-ui text-sm text-[#45545e]">No specialists loaded yet.</p>}
      </div>
    </section>
    </FadeIn>
  );
}