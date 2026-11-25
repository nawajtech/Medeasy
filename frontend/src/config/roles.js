export const ROLES = {
  SUPER_ADMIN:    "super_admin",
  COMPANY_ADMIN:  "company_admin",
  DOCTOR:         "doctor",
  STAFF:          "staff",
  LAB_TECHNICIAN: "lab_technician",
  RADIOLOGIST:    "radiologist",
  RECEPTIONIST:   "receptionist",
};

const directoryMenu = [
  { to: "/patients", label: "Patients" },
  { to: "/departments", label: "Departments" },
];

const labMenu = [
  { to: "/lab/doctors", label: "Doctors" },
  { to: "/lab/tests", label: "Lab Catalog" },
  { to: "/lab/orders", label: "Lab Orders" },
];

const diagnosticsMenu = [
  { to: "/diagnostics/doctors", label: "Doctors" },
  { to: "/diagnostics", label: "Diagnostic Catalog" },
  { to: "/diagnostics/orders", label: "Diagnostic Orders" },
];

export const menuByRole = {
  [ROLES.SUPER_ADMIN]: [
    { to: "/", label: "Overview", end: true },
    { to: "/companies", label: "Companies" },
    { to: "/branches", label: "Branches" },
    ...directoryMenu,
    ...labMenu,
    ...diagnosticsMenu,
    { to: "/users", label: "Users" },
    { to: "/settings", label: "Settings" },
  ],
  [ROLES.COMPANY_ADMIN]: [
    { to: "/", label: "Overview", end: true },
    { to: "/branches", label: "Branches" },
    ...directoryMenu,
    ...labMenu,
    ...diagnosticsMenu,
    { to: "/users", label: "Users" },
    { to: "/settings", label: "Settings" },
  ],
  [ROLES.STAFF]: [
    { to: "/", label: "Overview", end: true },
    ...directoryMenu,
    ...labMenu,
    ...diagnosticsMenu,
  ],
  [ROLES.LAB_TECHNICIAN]: [
    { to: "/", label: "Overview", end: true },
    { to: "/patients", label: "Patients" },
    ...labMenu,
  ],
  [ROLES.RADIOLOGIST]: [
    { to: "/", label: "Overview", end: true },
    { to: "/patients", label: "Patients" },
    ...diagnosticsMenu,
  ],
  [ROLES.RECEPTIONIST]: [
    { to: "/", label: "Overview", end: true },
    { to: "/patients", label: "Patients" },
    ...labMenu,
    ...diagnosticsMenu,
  ],
  [ROLES.DOCTOR]: [
    { to: "/", label: "Overview", end: true },
    { to: "/patients", label: "My patients" },
    { to: "/diagnostics/today", label: "Today's appointments" },
    { to: "/lab/orders", label: "Lab Orders" },
    { to: "/diagnostics/orders", label: "Diagnostic Orders" },
  ],
};

export function canAccessRoute(role, path) {
  if (/^\/patients\/\d+$/.test(path)) {
    return (menuByRole[role] || []).some((item) => item.to === "/patients");
  }

  const items = menuByRole[role] || [];
  return items.some((item) => (item.end ? path === item.to : path.startsWith(item.to)));
}