import { Navigate, Outlet, useLocation } from "react-router-dom";
import { canAccessRoute } from "../config/roles";
import { useAuth } from "./AuthContext";

function RoleRoute() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user || !canAccessRoute(user.role, pathname)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
