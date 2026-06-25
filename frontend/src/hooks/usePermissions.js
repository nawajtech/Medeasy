import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../config/permissions";

export function usePermissions() {
  const { user } = useAuth();
  const permissions = user?.permissions ?? [];

  const can = (permission) => hasPermission(permissions, permission);
  const canAny = (...perms) => perms.some((p) => can(p));
  const canAll = (...perms) => perms.every((p) => can(p));

  return { permissions, can, canAny, canAll };
}
