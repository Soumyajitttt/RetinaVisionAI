import { apiFetch } from "./client";

// Accepts either shape:
//   PHC:    { clinicianId, name, email, password, facility? }
//   Doctor: { clinicianId, name, email, password, role: "doctor",
//             facility, specialty?, location: { lat, lng } }
// Passed straight through so new fields (role/specialty/location) don't
// need this wrapper updated again later.
export function register(details) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(details)
  });
}

export function login(clinicianId, password) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ clinicianId, password })
  });
}

export function me() {
  return apiFetch("/api/auth/me");
}