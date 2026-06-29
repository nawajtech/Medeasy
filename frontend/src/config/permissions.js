/**
 * Navigation and route access keyed by Spatie permission names.
 * Permissions are loaded from the API — this file only maps routes to required permissions.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  COMPANY_VIEW: "company.view",
  BRANCH_VIEW: "branch.view",
  DEPARTMENT_VIEW: "department.view",
  PATIENT_VIEW: "patient.view",
  PATIENT_CREATE: "patient.create",
  PATIENT_EDIT: "patient.edit",
  PATIENT_DELETE: "patient.delete",
  DOCTOR_VIEW: "doctor.view",
  DOCTOR_CREATE: "doctor.create",
  DOCTOR_EDIT: "doctor.edit",
  DOCTOR_DELETE: "doctor.delete",
  APPOINTMENT_VIEW: "appointment.view",
  APPOINTMENT_CREATE: "appointment.create",
  APPOINTMENT_EDIT: "appointment.edit",
  APPOINTMENT_DELETE: "appointment.delete",
  MEDICINE_VIEW: "medicine.view",
  MEDICINE_CREATE: "medicine.create",
  MEDICINE_EDIT: "medicine.edit",
  MEDICINE_DELETE: "medicine.delete",
  LAB_VIEW: "lab.view",
  DIAGNOSTIC_VIEW: "diagnostic.view",
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  ROLE_VIEW: "role.view",
  ROLE_CREATE: "role.create",
  ROLE_EDIT: "role.edit",
  ROLE_DELETE: "role.delete",
  ROLE_ASSIGN: "role.assign_permissions",
  BILLING_VIEW: "billing.view",
  BILLING_CREATE: "billing.create",
  BILLING_DELETE: "billing.delete",
  FINANCIAL_VIEW: "financial.view",
  FINANCIAL_CREATE: "financial.create",
  FINANCIAL_DELETE: "financial.delete",
};

/** Sidebar sections — order defines display sequence. */
export const MENU_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "clinic", label: "Clinic", description: "Patients, doctors & appointments" },
  { id: "laboratory", label: "Laboratory", description: "Tests, catalog & orders" },
  { id: "diagnostics", label: "Diagnostics", description: "Doctors, imaging & diagnostic orders" },
  { id: "finance", label: "Finance", description: "Profit, commissions & expenses" },
  { id: "admin", label: "Administration", description: "Settings & tenant management" },
];

export const menuItems = [
  { to: "/", label: "Overview", permission: PERMISSIONS.DASHBOARD_VIEW, end: true, section: "overview" },
  { to: "/patients", label: "Patients", permission: PERMISSIONS.PATIENT_VIEW, section: "overview" },
  { to: "/departments", label: "Departments", permission: PERMISSIONS.DEPARTMENT_VIEW, section: "clinic", altSection: "diagnostics", tenantModule: ["clinic", "diagnostics"] },
  { to: "/doctors", label: "Doctors", permission: PERMISSIONS.DOCTOR_VIEW, section: "clinic", altSection: "diagnostics", tenantModule: ["clinic", "diagnostics"] },
  { to: "/appointments", label: "Appointments", permission: PERMISSIONS.APPOINTMENT_VIEW, section: "clinic", tenantModule: "clinic" },
  { to: "/appointments", label: "My appointments", permission: PERMISSIONS.APPOINTMENT_VIEW, roleOnly: "doctor", section: "clinic", tenantModule: "clinic" },
  { to: "/patients", label: "My patients", permission: PERMISSIONS.PATIENT_VIEW, roleOnly: "doctor", section: "clinic", tenantModule: "clinic" },
  { to: "/my-schedule", label: "My schedule", permission: PERMISSIONS.DOCTOR_VIEW, roleOnly: "doctor", section: "clinic", tenantModule: "clinic" },
  { to: "/pharmacy/medicines", label: "Medicine Master", permission: PERMISSIONS.MEDICINE_VIEW, section: "clinic", tenantModule: "pharmacy" },
  { to: "/lab/tests", label: "Lab Catalog", permission: PERMISSIONS.LAB_VIEW, section: "laboratory", tenantModule: "laboratory" },
  { to: "/lab/orders", label: "Lab Orders", permission: PERMISSIONS.LAB_VIEW, section: "laboratory", tenantModule: "laboratory" },
  { to: "/diagnostics/today", label: "Today's appointments", permission: PERMISSIONS.DIAGNOSTIC_VIEW, roleOnly: "doctor", section: "diagnostics", tenantModule: "diagnostics" },
  { to: "/diagnostics", label: "Diagnostic Catalog", permission: PERMISSIONS.DIAGNOSTIC_VIEW, section: "diagnostics", tenantModule: "diagnostics", end: true },
  { to: "/diagnostics/referrals", label: "Referral By", permission: PERMISSIONS.DIAGNOSTIC_VIEW, section: "diagnostics", tenantModule: "diagnostics" },
  { to: "/diagnostics/orders", label: "Diagnostic Orders", permission: PERMISSIONS.DIAGNOSTIC_VIEW, section: "diagnostics", tenantModule: "diagnostics" },
  { to: "/finance", label: "Finance & P&L", permission: PERMISSIONS.FINANCIAL_VIEW, roleOnly: "company_admin", section: "finance" },
  { to: "/companies", label: "Companies", permission: PERMISSIONS.COMPANY_VIEW, section: "admin" },
  { to: "/branches", label: "Branches", permission: PERMISSIONS.BRANCH_VIEW, section: "admin" },
  { to: "/reports", label: "Reports", permission: PERMISSIONS.REPORT_VIEW, section: "admin", tenantModule: "clinic" },
  { to: "/users", label: "Users", permission: PERMISSIONS.USERS_VIEW, section: "admin" },
  { to: "/roles", label: "Roles", permission: PERMISSIONS.ROLE_VIEW, section: "admin" },
  { to: "/settings", label: "Settings", permission: PERMISSIONS.SETTINGS_VIEW, section: "admin" },
];

function tenantHasModule(modules, tenantModule) {
  if (!tenantModule) return true;
  const list = Array.isArray(tenantModule) ? tenantModule : [tenantModule];
  return list.some((m) => modules.has(m));
}

function resolveMenuSection(item, modules) {
  if (item.altSection && !modules.has("clinic") && modules.has("diagnostics")) {
    return item.altSection;
  }
  return item.section || "clinic";
}

/** Diagnostic-center doctor (no clinic module) — today queue only. */
export function isDiagnosticsOnlyDoctor(role, companyModules = null) {
  const modules = new Set(companyModules || []);
  return role === "doctor" && modules.has("diagnostics") && !modules.has("clinic");
}

export function filterMenuByPermissions(permissions = [], role, companyModules = null) {
  const set = new Set(permissions);
  const modules = new Set(companyModules || []);
  const isSuperAdmin = role === "super_admin";
  const diagnosticsOnlyDoctor = isDiagnosticsOnlyDoctor(role, companyModules);
  const seen = new Set();

  return menuItems
    .filter((item) => {
      if (diagnosticsOnlyDoctor) {
        return item.to === "/diagnostics/today" && item.label === "Today's appointments";
      }
      if (role === "super_admin" && (item.to === "/roles" || item.to.startsWith("/roles/"))) {
        return false;
      }
      if (item.roleOnly && item.roleOnly !== role) return false;
      if (item.tenantModule && !isSuperAdmin && !tenantHasModule(modules, item.tenantModule)) return false;
      if (item.permission && !set.has(item.permission)) return false;
      const key = item.to + item.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({
      ...item,
      section: resolveMenuSection(item, modules),
    }));
}

export function groupMenuItems(items) {
  const bySection = Object.fromEntries(MENU_SECTIONS.map((s) => [s.id, []]));

  for (const item of items) {
    const sectionId = item.section || "clinic";
    if (bySection[sectionId]) {
      bySection[sectionId].push(item);
    }
  }

  return MENU_SECTIONS
    .filter((section) => bySection[section.id].length > 0)
    .map((section) => ({
      ...section,
      items: bySection[section.id],
    }));
}

const routeRules = [
  { pattern: /^\/finance$/, permission: PERMISSIONS.FINANCIAL_VIEW, roleOnly: "company_admin" },
  { pattern: /^\/diagnostics\/today$/, permission: PERMISSIONS.DIAGNOSTIC_VIEW, roleOnly: "doctor" },
  { pattern: /^\/my-schedule$/, permission: PERMISSIONS.DOCTOR_VIEW, roleOnly: "doctor" },
  { pattern: /^\/patients\/\d+$/, permission: PERMISSIONS.PATIENT_VIEW },
  { pattern: /^\/doctors\/\d+\/availability$/, permission: PERMISSIONS.DOCTOR_VIEW },
  { pattern: /^\/roles\/\d+$/, permission: PERMISSIONS.ROLE_VIEW },
];

export function canAccessRoute(permissions = [], role, path, companyModules = null) {
  if (role === "super_admin" && (path === "/roles" || path.startsWith("/roles/"))) {
    return false;
  }

  if (isDiagnosticsOnlyDoctor(role, companyModules)) {
    return path === "/" || path === "/diagnostics/today";
  }

  const set = new Set(permissions);

  for (const rule of routeRules) {
    if (rule.pattern.test(path)) {
      if (rule.roleOnly && rule.roleOnly !== role) return false;
      if (rule.permission && !set.has(rule.permission)) return false;
      return true;
    }
  }

  const items = filterMenuByPermissions(permissions, role, companyModules);
  return items.some((item) => (item.end ? path === item.to : path.startsWith(item.to)));
}

export function hasPermission(permissions, permission) {
  return (permissions || []).includes(permission);
}
