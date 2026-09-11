import { Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthModal from "./components/modals/AuthModal";
import LandingPage from "./pages/LandingPage";
import DatabasePage from "./pages/DatabasePage";
import UserReportPage from "./pages/UserReportPage";
import GradingDetailPage from "./pages/GradingDetailPage";
import PdfReportPage from "./pages/PdfReportPage";
import SpecialistsPage from "./pages/SpecialistsPage";
import FundusAnalyzer from "./FundusAnalyzer";

// The landing page ships its own full-bleed hero + nav (Originkit hero-01),
// so it renders outside the app chrome. Every other route sits inside the
// SaaS-style shell: a collapsible sidebar for navigation plus a slim top bar.
function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[#f8f8f8]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppLayout />}>
            <Route
              path="/analyze"
              element={
                <ProtectedRoute>
                  <FundusAnalyzer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/database"
              element={
                <ProtectedRoute>
                  <DatabasePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <UserReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grading"
              element={
                <ProtectedRoute>
                  <GradingDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pdf-report"
              element={
                <ProtectedRoute>
                  <PdfReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/specialists"
              element={
                <ProtectedRoute>
                  <SpecialistsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <p className="font-tight text-sm text-[#45545e]">
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
    </AuthProvider>
  );
}