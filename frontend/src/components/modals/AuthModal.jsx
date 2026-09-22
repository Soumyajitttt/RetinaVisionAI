import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPinIcon } from "@heroicons/react/24/outline";
import Modal from "./Modal";
import { useAuth } from "../../context/AuthContext";
import { getCurrentPosition, reverseGeocode, searchLocation } from "../../utils/geolocation";

const inputClasses =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 font-ui text-sm text-[#010110] placeholder:text-[#8a8f98] focus:border-[#010110] focus:outline-none focus:ring-1 focus:ring-[#010110]/15";
const labelClasses = "mb-1 block font-ui text-sm font-medium text-[#45545e]";

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 font-ui text-sm font-semibold transition ${
        active
          ? "bg-white text-[#010110] shadow-sm"
          : "text-[#8a8f98] hover:text-[#45545e]"
      }`}
    >
      {children}
    </button>
  );
}

// Landing user on the right page for their account type after login/register.
function routeForRole(role, navigate) {
  navigate(role === "doctor" ? "/doctor" : "/database");
}

function LoginForm() {
  const { login, authError } = useAuth();
  const navigate = useNavigate();
  const [clinicianId, setClinicianId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const loggedInUser = await login(clinicianId, password);
    setSubmitting(false);
    if (loggedInUser) {
      setClinicianId("");
      setPassword("");
      routeForRole(loggedInUser.role, navigate);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="clinicianId" className={labelClasses}>
          Login ID
        </label>
        <input
          id="clinicianId"
          type="text"
          placeholder="PHC-RAMPUR-102 or your Doctor ID"
          required
          value={clinicianId}
          onChange={(e) => setClinicianId(e.target.value)}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="password" className={labelClasses}>
          Password
        </label>
        <input
          id="password"
          type="password"
          placeholder="********"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClasses}
        />
      </div>

      {authError && (
        <p className="font-ui text-sm font-medium text-red-600">{authError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-[#111318] py-2.5 font-ui text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
      >
        {submitting ? "Logging in..." : "Login"}
      </button>

      <p className="font-ui text-xs text-[#8a8f98]">
        Demo PHC credentials: <strong>PHC-RAMPUR-102</strong> /{" "}
        <strong>password123</strong>
      </p>
    </form>
  );
}

function RoleToggle({ role, onChange }) {
  return (
    <div className="mb-3 flex gap-1 rounded-xl bg-[#f0f0ee] p-1">
      <TabButton active={role === "phc"} onClick={() => onChange("phc")}>
        PHC / Clinician
      </TabButton>
      <TabButton active={role === "doctor"} onClick={() => onChange("doctor")}>
        Doctor / Specialist
      </TabButton>
    </div>
  );
}

function RegisterForm() {
  const { register, authError } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("phc");
  const [form, setForm] = useState({
    clinicianId: "",
    name: "",
    email: "",
    facility: "",
    specialty: "",
    password: "",
    confirmPassword: ""
  });
  const [coords, setCoords] = useState(null); // { lat, lng } - stored for accuracy, not shown raw
  const [locationLabel, setLocationLabel] = useState(""); // human-readable, shown to the user
  const [manualQuery, setManualQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleUseLocation() {
    setLocating(true);
    setLocalError("");
    const pos = await getCurrentPosition();
    if (!pos) {
      setLocating(false);
      setLocalError(
        "Couldn't get your location automatically - your browser may have blocked it. Type your city/area below instead."
      );
      return;
    }
    setCoords(pos);
    const label = await reverseGeocode(pos);
    setLocationLabel(label || `${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)}`);
    setLocating(false);
  }

  async function handleManualSearch() {
    if (!manualQuery.trim()) return;
    setGeocoding(true);
    setLocalError("");
    const result = await searchLocation(manualQuery);
    setGeocoding(false);
    if (!result) {
      setLocalError("Couldn't find that place - try a nearby town or city name instead.");
      return;
    }
    setCoords({ lat: result.lat, lng: result.lng });
    setLocationLabel(result.label);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError("");

    if (form.password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    const payload = {
      clinicianId: form.clinicianId,
      name: form.name,
      email: form.email,
      facility: form.facility,
      password: form.password,
      role
    };

    if (role === "doctor") {
      if (!coords) {
        setLocalError('Set a location - tap "Use my current location" or search for your city/area below');
        return;
      }
      payload.specialty = form.specialty;
      payload.location = { lat: coords.lat, lng: coords.lng };
      payload.locationLabel = locationLabel;
    }

    setSubmitting(true);
    const newUser = await register(payload);
    setSubmitting(false);
    if (newUser) {
      setForm({ clinicianId: "", name: "", email: "", facility: "", specialty: "", password: "", confirmPassword: "" });
      setCoords(null);
      setLocationLabel("");
      setManualQuery("");
      routeForRole(newUser.role, navigate);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <RoleToggle role={role} onChange={setRole} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-clinicianId" className={labelClasses}>
            {role === "doctor" ? "Doctor ID" : "Clinician ID"}
          </label>
          <input
            id="reg-clinicianId"
            type="text"
            placeholder={role === "doctor" ? "DOC-RAMPUR-01" : "PHC-RAMPUR-103"}
            required
            value={form.clinicianId}
            onChange={update("clinicianId")}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="reg-name" className={labelClasses}>
            Full name
          </label>
          <input
            id="reg-name"
            type="text"
            placeholder="Dr. Anjali Rao"
            required
            value={form.name}
            onChange={update("name")}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor="reg-email" className={labelClasses}>
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          placeholder="you@example.in"
          required
          value={form.email}
          onChange={update("email")}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="reg-facility" className={labelClasses}>
          {role === "doctor" ? "Hospital / Facility name" : "Facility"}{" "}
          {role === "phc" && <span className="font-normal text-[#8a8f98]">(optional)</span>}
        </label>
        <input
          id="reg-facility"
          type="text"
          placeholder={role === "doctor" ? "Apex Eye Institute" : "Rampur PHC Center"}
          required={role === "doctor"}
          value={form.facility}
          onChange={update("facility")}
          className={inputClasses}
        />
      </div>

      {role === "doctor" && (
        <>
          <div>
            <label htmlFor="reg-specialty" className={labelClasses}>
              Specialty <span className="font-normal text-[#8a8f98]">(optional)</span>
            </label>
            <input
              id="reg-specialty"
              type="text"
              placeholder="Ophthalmologist, Vitreoretinal Specialist..."
              value={form.specialty}
              onChange={update("specialty")}
              className={inputClasses}
            />
          </div>

          <div className="rounded-xl border border-black/10 bg-[#f8f8f8] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className={labelClasses + " mb-0"}>Hospital location</span>
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locating}
                className="flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1 font-ui text-xs font-semibold text-[#242424] transition hover:bg-[#f0f0ee] disabled:opacity-60"
              >
                {locating ? (
                  "Locating..."
                ) : (
                  <>
                    <MapPinIcon className="size-3.5" />
                    Use my current location
                  </>
                )}
              </button>
            </div>

            {locationLabel ? (
              <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 font-ui text-sm text-[#010110]">
                <MapPinIcon className="size-4 shrink-0 text-[#8a8f98]" aria-hidden="true" />
                <span>{locationLabel}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your city or area (e.g. Rampur, Uttar Pradesh)"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleManualSearch();
                    }
                  }}
                  className={inputClasses}
                />
                <button
                  type="button"
                  onClick={handleManualSearch}
                  disabled={geocoding || !manualQuery.trim()}
                  className="shrink-0 rounded-xl border border-black/15 bg-white px-3 py-2 font-ui text-sm font-semibold text-[#242424] transition hover:bg-[#f0f0ee] disabled:opacity-60"
                >
                  {geocoding ? "Finding..." : "Find"}
                </button>
              </div>
            )}

            {locationLabel && (
              <button
                type="button"
                onClick={() => {
                  setCoords(null);
                  setLocationLabel("");
                  setManualQuery("");
                }}
                className="mt-2 font-ui text-xs font-medium text-[#8a8f98] underline hover:text-[#45545e]"
              >
                Change location
              </button>
            )}

            <p className="mt-2 font-ui text-xs text-[#8a8f98]">
              Used to sort you by real distance on PHC clinicians' Specialists page. We only show your
              city/area on screen - exact coordinates are kept behind the scenes for accuracy.
            </p>
          </div>
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-password" className={labelClasses}>
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            placeholder="At least 8 characters"
            required
            value={form.password}
            onChange={update("password")}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="reg-confirmPassword" className={labelClasses}>
            Confirm password
          </label>
          <input
            id="reg-confirmPassword"
            type="password"
            placeholder="********"
            required
            value={form.confirmPassword}
            onChange={update("confirmPassword")}
            className={inputClasses}
          />
        </div>
      </div>

      {(localError || authError) && (
        <p className="font-ui text-sm font-medium text-red-600">
          {localError || authError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-[#111318] py-2.5 font-ui text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
      >
        {submitting ? "Creating account..." : role === "doctor" ? "Create doctor account" : "Create account"}
      </button>
    </form>
  );
}

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, authMode, setAuthMode } = useAuth();

  return (
    <Modal
      open={authModalOpen}
      title="Login / Register"
      onClose={closeAuthModal}
    >
      <div className="mb-4 flex gap-1 rounded-xl bg-[#f0f0ee] p-1">
        <TabButton
          active={authMode === "login"}
          onClick={() => setAuthMode("login")}
        >
          Login
        </TabButton>
        <TabButton
          active={authMode === "register"}
          onClick={() => setAuthMode("register")}
        >
          Register
        </TabButton>
      </div>

      {authMode === "login" ? <LoginForm /> : <RegisterForm />}
    </Modal>
  );
}