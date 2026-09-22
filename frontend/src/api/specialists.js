import { apiFetch } from "./client";

// coords: optional { lat, lng } from the PHC's browser geolocation (see
// utils/geolocation.js) - when provided, the backend computes real
// distances to every registered doctor instead of using static fallbacks.
export function getSpecialists(coords) {
  const qs = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
  return apiFetch(`/api/specialists${qs}`);
}

export function sendReferral(specialistId, patientId) {
  return apiFetch(`/api/specialists/${specialistId}/send`, {
    method: "POST",
    body: JSON.stringify({ patientId })
  });
}