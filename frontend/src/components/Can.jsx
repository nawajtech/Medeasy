import { usePermissions } from "../hooks/usePermissions";

/**
 * React equivalent of Blade @can — renders children only when permission is granted.
 */
export default function Can({ permission, any, all, children, fallback = null }) {
  const { can, canAny, canAll } = usePermissions();

  let allowed = false;
  if (permission) allowed = can(permission);
  else if (any?.length) allowed = canAny(...any);
  else if (all?.length) allowed = canAll(...all);

  return allowed ? children : fallback;
}
