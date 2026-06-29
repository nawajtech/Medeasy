export const COMPANY_MODULES = [
  { key: "clinic", label: "Clinic", description: "Patients, doctors, appointments" },
  { key: "pharmacy", label: "Pharmacy", description: "Medicine master & dispensing" },
  { key: "laboratory", label: "Laboratory", description: "Lab catalog, orders & results" },
  { key: "diagnostics", label: "Diagnostics", description: "Doctors, imaging & diagnostic orders" },
];

export const MODULE_PRESETS = [
  { id: "clinic", label: "Clinic only", modules: ["clinic"] },
  { id: "clinic_pharmacy", label: "Clinic + Pharmacy", modules: ["clinic", "pharmacy"] },
  { id: "laboratory", label: "Laboratory only", modules: ["laboratory"] },
  { id: "diagnostics", label: "Diagnostics only", modules: ["diagnostics"] },
  { id: "diagnostics_laboratory", label: "Diagnostics + Lab", modules: ["diagnostics", "laboratory"] },
  { id: "hospital", label: "Hospital (all services)", modules: ["clinic", "pharmacy", "laboratory", "diagnostics"] },
];

const MODULE_LABELS = Object.fromEntries(COMPANY_MODULES.map((m) => [m.key, m.label]));

export function formatModulesLabel(modules = []) {
  const keys = [...new Set(modules)].filter(Boolean);
  if (keys.length === 0) return "Clinic";
  if (keys.length === COMPANY_MODULES.length) return "Hospital (All services)";
  return keys.map((k) => MODULE_LABELS[k] || k).join(" + ");
}

export function modulesFromLegacyType(type) {
  switch (type) {
    case "pharmacy":
      return ["pharmacy"];
    case "pathology_lab":
      return ["laboratory"];
    case "diagnostic_center":
      return ["diagnostics"];
    case "hospital":
      return ["clinic", "pharmacy", "laboratory", "diagnostics"];
    case "multi":
      return ["clinic"];
    default:
      return ["clinic"];
  }
}

export function normalizeModules(modules) {
  const allowed = new Set(COMPANY_MODULES.map((m) => m.key));
  return [...new Set((modules || []).filter((m) => allowed.has(m)))];
}
