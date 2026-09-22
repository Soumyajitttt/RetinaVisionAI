import { apiFetch } from "./client";

export function getInvitableDoctors() {
  return apiFetch("/api/discussions/doctors");
}

export function getMyDiscussions() {
  return apiFetch("/api/discussions/mine");
}

export function getDiscussion(id) {
  return apiFetch(`/api/discussions/${id}`);
}

export function createDiscussion({ patientId, invitedDoctorId, subject }) {
  return apiFetch("/api/discussions", {
    method: "POST",
    body: JSON.stringify({ patientId, invitedDoctorId, subject })
  });
}

export function addComment(id, text) {
  return apiFetch(`/api/discussions/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
}