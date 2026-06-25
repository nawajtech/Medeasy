import { Navigate, Outlet, useLocation } from "react-router-dom";
import { canAccessRoute } from "../config/permissions";
import { useAuth } from "./AuthContext";

function RoleRoute() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user || !canAccessRoute(user.permissions, user.role, pathname, user.company?.modules)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
