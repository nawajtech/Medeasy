export const ROLES = {
  SUPER_ADMIN: "super_admin",
  COMPANY_ADMIN: "company_admin",
  DOCTOR: "doctor",
  STAFF: "staff",
};

export const menuByRole = {
  [ROLES.SUPER_ADMIN]: [
    { to: "/", label: "Overview", end: true },
    { to: "/companies", label: "Companies" },
    { to: "/patients", label: "Patients" },
    { to: "/departments", label: "Departments" },
    { to: "/doctors", label: "Doctors" },
    { to: "/appointments", label: "Appointments" },
    { to: "/reports", label: "Reports" },
    { to: "/users", label: "Users" },
    { to: "/settings", label: "Settings" },
  ],
  [ROLES.COMPANY_ADMIN]: [
    { to: "/", label: "Overview", end: true },
    { to: "/patients", label: "Patients" },
    { to: "/departments", label: "Departments" },
    { to: "/doctors", label: "Doctors" },
    { to: "/appointments", label: "Appointments" },
    { to: "/reports", label: "Reports" },
    { to: "/users", label: "Staff" },
    { to: "/settings", label: "Settings" },
  ],
  [ROLES.STAFF]: [
    { to: "/", label: "Overview", end: true },
    { to: "/patients", label: "Patients" },
    { to: "/doctors", label: "Doctors" },
    { to: "/appointments", label: "Appointments" },
  ],
  [ROLES.DOCTOR]: [
    { to: "/", label: "Overview", end: true },
    { to: "/appointments", label: "My appointments" },
    { to: "/patients", label: "My patients" },
    { to: "/my-schedule", label: "My schedule" },
  ],
};

export function canAccessRoute(role, path) {
  if (path === "/my-schedule") {
    return role === ROLES.DOCTOR;
  }

  if (/^\/doctors\/\d+\/availability$/.test(path)) {
    return [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.DOCTOR, ROLES.STAFF].includes(role);
  }

  const items = menuByRole[role] || [];
  return items.some((item) => (item.end ? path === item.to : path.startsWith(item.to)));
}
