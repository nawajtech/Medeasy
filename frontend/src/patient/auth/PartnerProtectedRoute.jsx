import { Navigate, Outlet, useLocation } from "react-router-dom";
import { usePartnerAuth } from "./PartnerAuthContext";

export default function PartnerProtectedRoute() {
  const { isAuthenticated, loading } = usePartnerAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="pt-loading">
        <div className="pt-spinner" />
        <p>Restoring session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
