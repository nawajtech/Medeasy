import { Navigate, Outlet, useLocation } from "react-router-dom";
import { canAccessRoute, filterMenuByPermissions } from "../config/permissions";
import { useAuth } from "./AuthContext";

function RoleRoute() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (canAccessRoute(user.permissions, user.role, pathname, user.company?.modules)) {
    return <Outlet />;
  }

  const fallback = filterMenuByPermissions(
    user.permissions,
    user.role,
    user.company?.modules
  ).find((item) => item.to !== pathname)?.to;

  if (fallback) {
    return <Navigate to={fallback} replace />;
  }

  return <Navigate to="/login" replace />;
}

export default RoleRoute;
