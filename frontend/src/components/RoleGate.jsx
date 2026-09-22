import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Sits inside ProtectedRoute (so auth is already confirmed) and redirects
// away if the logged-in account's role isn't the one this route is for -
// e.g. a doctor hitting /database gets bounced to /doctor instead of
// seeing a broken PHC page (the API would 403 anyway; this just avoids
// the round trip and shows the right page immediately).
export default function RoleGate({ allow, redirectTo, children }) {
  const { user } = useAuth();
  if (user && user.role !== allow) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
}
