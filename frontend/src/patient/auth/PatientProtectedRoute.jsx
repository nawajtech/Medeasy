import { Navigate, Outlet } from "react-router-dom";
import { usePatientAuth } from "../auth/PatientAuthContext";

export default function PatientProtectedRoute() {
  const { isAuthenticated, loading } = usePatientAuth();

  if (loading) {
    return (
      <div className="pt-loading">
        <div className="pt-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
