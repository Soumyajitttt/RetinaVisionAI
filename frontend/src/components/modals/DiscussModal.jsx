import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import * as discussionsApi from "../../api/discussions";

const inputClasses =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 font-ui text-sm text-[#010110] placeholder:text-[#8a8f98] focus:border-[#010110] focus:outline-none focus:ring-1 focus:ring-[#010110]/15";
const labelClasses = "mb-1 block font-ui text-sm font-medium text-[#45545e]";

// Opened from a patient's expanded card in DoctorInboxPage. Lets the
// referred doctor invite one other registered doctor to consult on this
// specific patient, with a subject/question to kick off the thread.
export default function DiscussModal({ open, onClose, patientId, patientName }) {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [invitedDoctorId, setInvitedDoctorId] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSubject("");
    setInvitedDoctorId("");
    setLoadingDoctors(true);
    discussionsApi
      .getInvitableDoctors()
      .then((data) => {
        setDoctors(data);
        setInvitedDoctorId(data[0]?.id || "");
      })
      .catch((err) => setError(err.message || "Failed to load doctors"))
      .finally(() => setLoadingDoctors(false));
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!invitedDoctorId) {
      setError("Choose a doctor to invite");
      return;
    }
    if (!subject.trim()) {
      setError("Add a subject or question to start the discussion");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const discussion = await discussionsApi.createDiscussion({
        patientId,
        invitedDoctorId,
        subject: subject.trim()
      });
      onClose();
      navigate(`/discussions/${discussion.id}`);
    } catch (err) {
      setError(err.message || "Failed to start discussion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={`Discuss ${patientName || "patient"}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="discuss-doctor" className={labelClasses}>
            Invite a doctor
          </label>
          {loadingDoctors ? (
            <p className="font-ui text-sm text-[#8a8f98]">Loading doctors...</p>
          ) : doctors.length === 0 ? (
            <p className="font-ui text-sm text-[#8a8f98]">
              No other registered doctors are available to invite yet.
            </p>
          ) : (
            <select
              id="discuss-doctor"
              value={invitedDoctorId}
              onChange={(e) => setInvitedDoctorId(e.target.value)}
              className={inputClasses}
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} &middot; {d.role} ({d.facility})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="discuss-subject" className={labelClasses}>
            Subject / question
          </label>
          <textarea
            id="discuss-subject"
            rows={3}
            required
            placeholder="e.g. Not fully confident on the grade here - severe or moderate NPDR?"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClasses}
          />
        </div>

        {error && <p className="font-ui text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || doctors.length === 0}
          className="w-full rounded-full bg-[#111318] py-2.5 font-ui text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
        >
          {submitting ? "Starting discussion..." : "Start discussion"}
        </button>
      </form>
    </Modal>
  );
}
