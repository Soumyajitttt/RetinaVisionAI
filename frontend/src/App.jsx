import { Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import { DiscussionNotificationsProvider } from "./context/DiscussionNotificationsContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGate from "./components/RoleGate";
import AuthModal from "./components/modals/AuthModal";
import LandingPage from "./pages/LandingPage";
import DatabasePage from "./pages/DatabasePage";
import UserReportPage from "./pages/UserReportPage";
import GradingDetailPage from "./pages/GradingDetailPage";
import PdfReportPage from "./pages/PdfReportPage";
import SpecialistsPage from "./pages/SpecialistsPage";
import ReferralHistoryPage from "./pages/ReferralHistoryPage";
import DoctorInboxPage from "./pages/DoctorInboxPage";
import DiscussionsPage from "./pages/DiscussionsPage";
import DiscussionDetailPage from "./pages/DiscussionDetailPage";
import FundusAnalyzer from "./FundusAnalyzer";

// The landing page ships its own full-bleed hero + nav (Originkit hero-01),
// so it renders outside the app chrome. Every other route sits inside the
// SaaS-style shell: a collapsible sidebar for navigation plus a slim top bar.
function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#f8f8f8] print:bg-white">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col print:w-full">
        <Topbar />
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 print:p-0">
          <div className="mx-auto max-w-6xl print:max-w-none">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// PHC-only page: auth required AND role must be "phc" (a doctor hitting
// one of these gets bounced to /doctor - see RoleGate).
function PhcRoute({ children }) {
  return (
    <ProtectedRoute>
      <RoleGate allow="phc" redirectTo="/doctor">
        {children}
      </RoleGate>
    </ProtectedRoute>
  );
}

// Doctor-only page: auth required AND role must be "doctor".
function DoctorRoute({ children }) {
  return (
    <ProtectedRoute>
      <RoleGate allow="doctor" redirectTo="/database">
        {children}
      </RoleGate>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DiscussionNotificationsProvider>
        <AppProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<AppLayout />}>
              <Route
                path="/analyze"
                element={
                  <PhcRoute>
                    <FundusAnalyzer />
                  </PhcRoute>
                }
              />
              <Route
                path="/database"
                element={
                  <PhcRoute>
                    <DatabasePage />
                  </PhcRoute>
                }
              />
              <Route
                path="/report"
                element={
                  <PhcRoute>
                    <UserReportPage />
                  </PhcRoute>
                }
              />
              <Route
                path="/grading"
                element={
                  <PhcRoute>
                    <GradingDetailPage />
                  </PhcRoute>
                }
              />
              <Route
                path="/pdf-report"
                element={
                  <PhcRoute>
                    <PdfReportPage />
                  </PhcRoute>
                }
              />
              <Route
                path="/specialists"
                element={
                  <PhcRoute>
                    <SpecialistsPage />
                  </PhcRoute>
                }
              />
              <Route
                path="/referrals"
                element={
                  <PhcRoute>
                    <ReferralHistoryPage />
                  </PhcRoute>
                }
              />
              <Route
                path="/doctor"
                element={
                  <DoctorRoute>
                    <DoctorInboxPage />
                  </DoctorRoute>
                }
              />
              <Route
                path="/discussions"
                element={
                  <DoctorRoute>
                    <DiscussionsPage />
                  </DoctorRoute>
                }
              />
              <Route
                path="/discussions/:id"
                element={
                  <DoctorRoute>
                    <DiscussionDetailPage />
                  </DoctorRoute>
                }
              />
              <Route
                path="*"
                element={
                  <p className="font-ui text-sm text-[#45545e]">
                    Page not found.
                  </p>
                }
              />
            </Route>
          </Routes>

          {/* Rendered globally (not inside Header) so the Landing page's own
              hero nav can trigger it too - see hero-01-content.jsx's Login button. */}
          <AuthModal />
        </AppProvider>
      </DiscussionNotificationsProvider>
    </AuthProvider>
  );
}