export const ROLES = {
  SUPER_ADMIN:    "super_admin",
  COMPANY_ADMIN:  "company_admin",
  DOCTOR:         "doctor",
  STAFF:          "staff",
  LAB_TECHNICIAN: "lab_technician",
  RADIOLOGIST:    "radiologist",
  RECEPTIONIST:   "receptionist",
  PHARMACIST:     "pharmacist",
};

const clinicMenu = [
  { to: "/patients", label: "Patients" },
  { to: "/departments", label: "Departments" },
  { to: "/doctors", label: "Doctors" },
  { to: "/appointments", label: "Appointments" },
];

const labMenu = [
  { to: "/lab/tests", label: "Lab Catalog" },
  { to: "/lab/orders", label: "Lab Orders" },
];

const diagnosticsMenu = [
  { to: "/diagnostics", label: "Diagnostics" },
];

export const menuByRole = {
  [ROLES.SUPER_ADMIN]: [
    { to: "/", label: "Overview", end: true },
    { to: "/companies", label: "Companies" },
    { to: "/branches", label: "Branches" },
    ...clinicMenu,
    ...labMenu,
    ...diagnosticsMenu,
    { to: "/reports", label: "Reports" },
    { to: "/users", label: "Users" },
    { to: "/settings", label: "Settings" },
  ],
  [ROLES.COMPANY_ADMIN]: [
    { to: "/", label: "Overview", end: true },
    { to: "/branches", label: "Branches" },
    ...clinicMenu,
    ...labMenu,
    ...diagnosticsMenu,
    { to: "/reports", label: "Reports" },
    { to: "/users", label: "Staff" },
    { to: "/settings", label: "Settings" },
  ],
  [ROLES.STAFF]: [
    { to: "/", label: "Overview", end: true },
    ...clinicMenu,
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
    { to: "/appointments", label: "Appointments" },
    ...labMenu,
    ...diagnosticsMenu,
  ],
  [ROLES.DOCTOR]: [
    { to: "/", label: "Overview", end: true },
    { to: "/appointments", label: "My appointments" },
    { to: "/patients", label: "My patients" },
    { to: "/lab/orders", label: "Lab Orders" },
    { to: "/diagnostics", label: "Diagnostics" },
    { to: "/my-schedule", label: "My schedule" },
  ],
  [ROLES.PHARMACIST]: [
    { to: "/", label: "Overview", end: true },
    { to: "/patients", label: "Patients" },
  ],
};

export function canAccessRoute(role, path) {
  if (path === "/my-schedule") {
    return role === ROLES.DOCTOR;
  }

  if (/^\/doctors\/\d+\/availability$/.test(path)) {
    return [ROLES.SUPER_ADMIN, ROLES.COMPANY_ADMIN, ROLES.DOCTOR, ROLES.STAFF, ROLES.RECEPTIONIST].includes(role);
  }

  const items = menuByRole[role] || [];
  return items.some((item) => (item.end ? path === item.to : path.startsWith(item.to)));
}
