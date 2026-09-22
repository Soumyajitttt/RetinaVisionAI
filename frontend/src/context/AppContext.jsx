import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import * as patientsApi from "../api/patients";
import * as analysisApi from "../api/analysis";
import * as specialistsApi from "../api/specialists";
import { getCurrentPosition } from "../utils/geolocation";

const AppContext = createContext(null);

export const GRADE_LABELS = {
  0: "Grade 0: Normal",
  1: "Grade 1: Mild DR",
  2: "Grade 2: Moderate DR",
  3: "Grade 3: Severe DR",
  4: "Grade 4: Proliferative DR"
};

export function AppProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  // Doctor accounts have no access to /api/patients, /api/analysis or
  // /api/specialists (see backend/src/routes/index.js) - their entire view
  // of patient data comes from GET /api/referrals/mine (see
  // pages/DoctorInboxPage.jsx), which doesn't go through this context.
  const isPhc = isAuthenticated && user?.role !== "doctor";

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState("");

  const [specialists, setSpecialists] = useState([]);

  const [activePatientId, setActivePatientId] = useState(null);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const activePatient = useMemo(
    () => patients.find((p) => p.id === activePatientId) ?? null,
    [patients, activePatientId]
  );

  async function refreshPatients() {
    setPatientsLoading(true);
    setPatientsError("");
    try {
      const data = await patientsApi.getPatients();
      setPatients(data);
      setActivePatientId((current) => current ?? data[0]?.id ?? null);
    } catch (err) {
      setPatientsError(err.message || "Failed to load patients");
    } finally {
      setPatientsLoading(false);
    }
  }

  // Load patients + specialists once logged in - PHC role only.
  useEffect(() => {
    if (!isPhc) {
      setPatients([]);
      setSpecialists([]);
      setActivePatientId(null);
      setActiveAnalysis(null);
      return;
    }
    refreshPatients();
    // Try the browser's geolocation first so specialists are sorted by real
    // distance; getCurrentPosition() resolves to null (never rejects) if
    // it's unavailable or denied, in which case the backend just falls
    // back to each specialist's static distanceKm.
    getCurrentPosition().then((coords) => {
      specialistsApi.getSpecialists(coords).then(setSpecialists).catch(() => setSpecialists([]));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPhc]);

  // Fetch the analysis result whenever the active patient changes.
  useEffect(() => {
    if (!isPhc || !activePatientId) {
      setActiveAnalysis(null);
      return;
    }
    setAnalysisLoading(true);
    analysisApi
      .getAnalysis(activePatientId)
      .then(setActiveAnalysis)
      .catch(() => setActiveAnalysis(null))
      .finally(() => setAnalysisLoading(false));
  }, [isPhc, activePatientId]);

  async function addPatient({ name, age, gender, village }) {
    const newPatient = await patientsApi.createPatient({ name, age, gender, village });
    setPatients((prev) => [newPatient, ...prev]);
    return newPatient;
  }

  // Uploads a fundus image for a patient and runs it through the backend's
  // analysis pipeline (see backend/src/utils/runMatlabPipeline.js).
  async function analyzeImage(patientId, file) {
    const result = await analysisApi.uploadAnalysis(patientId, file);
    setActiveAnalysis(result);
    setPatients((prev) =>
      prev.map((p) => (p.id === patientId ? { ...p, grade: result.grade, gradeText: result.gradeText } : p))
    );
    return result;
  }

  async function sendReferral(specialistId) {
    return specialistsApi.sendReferral(specialistId, activePatientId);
  }

  const value = {
    patients,
    patientsLoading,
    patientsError,
    specialists,
    activePatientId,
    setActivePatientId,
    activePatient,
    activeAnalysis,
    analysisLoading,
    addPatient,
    analyzeImage,
    sendReferral,
    refreshPatients
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}
