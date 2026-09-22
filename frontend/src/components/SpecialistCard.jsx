import { ArrowPathIcon } from "@heroicons/react/24/outline";

// status: "idle" | "sending" | "sent" | "logged" | "failed"
//  - sending: request in flight (button disabled, spinner)
//  - sent:    referral logged AND the email actually delivered
//  - logged:  referral logged but the email was skipped/failed (see alert for why)
//  - failed:  the request itself failed (network/server error)
const STATUS_LABEL = {
  idle: "Send",
  sending: "Sending...",
  sent: "Sent \u2713",
  logged: "Logged",
  failed: "Failed"
};

const STATUS_CLASSES = {
  idle: "bg-[#111318] hover:bg-black",
  sending: "bg-[#111318] cursor-wait opacity-80",
  sent: "bg-emerald-600 hover:bg-emerald-600",
  logged: "bg-amber-500 hover:bg-amber-500",
  failed: "bg-red-600 hover:bg-red-600"
};

export default function SpecialistCard({ specialist, onSend, status = "idle" }) {
  const isSending = status === "sending";

  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-black/10 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#efeff0] font-ui font-bold text-[#010110]">
          {specialist.name
            .split(" ")
            .map((w) => w[0])
            .slice(-2)
            .join("")}
        </div>
        <div>
          <h3 className="font-ui font-semibold text-[#010110]">
            {specialist.name} <span className="font-normal text-[#45545e]">({specialist.role})</span>
          </h3>
          <p className="font-ui text-sm text-[#45545e]">
            {specialist.facility}
            {specialist.locationLabel ? <> &bull; {specialist.locationLabel}</> : null} &bull;{" "}
            <strong>{specialist.distanceKm} km away</strong>
          </p>
        </div>
      </div>

      <button
        onClick={() => onSend(specialist)}
        disabled={isSending}
        className={`flex min-w-[104px] items-center justify-center gap-1.5 rounded-full px-4 py-2 font-ui text-sm font-semibold text-white transition ${STATUS_CLASSES[status] || STATUS_CLASSES.idle}`}
      >
        {isSending && <ArrowPathIcon className="size-3.5 animate-spin" />}
        {STATUS_LABEL[status] || STATUS_LABEL.idle}
      </button>
    </div>
  );
}