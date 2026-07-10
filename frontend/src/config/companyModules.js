export const COMPANY_MODULES = [
  { key: "clinic", label: "Clinic", description: "Patients, doctors, appointments & prescriptions" },
  { key: "laboratory", label: "Laboratory", description: "Lab catalog, orders & results" },
  { key: "diagnostics", label: "Diagnostics", description: "Imaging & diagnostic orders" },
];

export const MODULE_PRESETS = [
  { id: "clinic", label: "Clinic only", modules: ["clinic"] },
  { id: "laboratory", label: "Laboratory only", modules: ["laboratory"] },
  { id: "diagnostics", label: "Diagnostics only", modules: ["diagnostics"] },
  { id: "diagnostics_laboratory", label: "Diagnostics + Lab", modules: ["diagnostics", "laboratory"] },
  { id: "all_services", label: "All services", modules: ["clinic", "laboratory", "diagnostics"] },
];

const MODULE_LABELS = Object.fromEntries(COMPANY_MODULES.map((m) => [m.key, m.label]));

export function formatModulesLabel(modules = []) {
  const keys = [...new Set(modules)].filter(Boolean);
  if (keys.length === 0) return "Clinic";
  if (keys.length === COMPANY_MODULES.length) return "All services";
  return keys.map((k) => MODULE_LABELS[k] || k).join(" + ");
}

export function modulesFromLegacyType(type) {
  switch (type) {
    case "pathology_lab":
      return ["laboratory"];
    case "diagnostic_center":
      return ["diagnostics"];
    case "hospital":
    case "multi":
      return ["clinic", "laboratory", "diagnostics"];
    case "pharmacy":
      return ["clinic"];
    default:
      return ["clinic"];
  }
}

export function normalizeModules(modules) {
  const allowed = new Set(COMPANY_MODULES.map((m) => m.key));
  return [...new Set((modules || []).filter((m) => allowed.has(m)))];
}
