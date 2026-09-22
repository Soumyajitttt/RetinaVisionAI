import { apiFetch } from "./client";

// PHC-only: full referral history across all patients/specialists.
export function getReferralHistory() {
  return apiFetch("/api/referrals");
}

// Doctor-only: referrals sent to the logged-in doctor, each with the full
// patient + analysis snapshot attached (see referralController.getMyReferrals).
// This is the only patient data a doctor account can ever fetch.
export function getMyReferrals() {
  return apiFetch("/api/referrals/mine");
}