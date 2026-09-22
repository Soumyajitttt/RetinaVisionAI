// Wraps the browser Geolocation API in a Promise that never rejects -
// resolves { lat, lng } on success, or null on any failure/denial/timeout
// (no geolocation support, permission denied, took too long, etc). Callers
// treat null as "no location available" and fall back gracefully rather
// than showing an error, since location is always optional here.
export function getCurrentPosition({ timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout, maximumAge: 5 * 60 * 1000 },
    );
  });
}

// Turns { lat, lng } into a short, human-readable place name (e.g.
// "Rampur, Uttar Pradesh, India") using OpenStreetMap's free Nominatim
// reverse-geocoding API. Coordinates are still what gets stored/used for
// distance math (see specialistController.getSpecialists) - this is only
// for what's shown on screen. Resolves to null on any failure so callers
// can fall back to showing the raw coordinates instead.
export async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const place = a.city || a.town || a.village || a.county || a.suburb;
    const region = a.state;
    const label = [place, region, a.country].filter(Boolean).join(", ");
    return label || data.display_name || null;
  } catch {
    return null;
  }
}

// The reverse of the above: turns a place name a user types (e.g. "Rampur,
// Uttar Pradesh") into { lat, lng, label }, for the manual-entry fallback
// when browser geolocation isn't available or is denied.
export async function searchLocation(query) {
  const q = query.trim();
  if (!q) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const results = await res.json();
    const first = results[0];
    if (!first) return null;
    const a = first.address || {};
    const place = a.city || a.town || a.village || a.county || a.suburb;
    const region = a.state;
    const label = [place, region, a.country].filter(Boolean).join(", ") || first.display_name;
    return { lat: Number(first.lat), lng: Number(first.lon), label };
  } catch {
    return null;
  }
}