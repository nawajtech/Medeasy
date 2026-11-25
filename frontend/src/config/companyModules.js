export const COMPANY_MODULES = [
  { key: "laboratory", label: "Laboratory", description: "Lab catalog, orders & results" },
  { key: "diagnostics", label: "Diagnostics", description: "Imaging & diagnostic orders" },
];

export const MODULE_PRESETS = [
  { id: "laboratory", label: "Laboratory only", modules: ["laboratory"] },
  { id: "diagnostics", label: "Diagnostics only", modules: ["diagnostics"] },
  { id: "diagnostics_laboratory", label: "Diagnostics + Lab", modules: ["diagnostics", "laboratory"] },
  { id: "all_services", label: "All services", modules: ["laboratory", "diagnostics"] },
];

const MODULE_LABELS = Object.fromEntries(COMPANY_MODULES.map((m) => [m.key, m.label]));

export function formatModulesLabel(modules = []) {
  const keys = [...new Set(modules)].filter((k) => k !== "clinic").filter(Boolean);
  if (keys.length === 0) return "No services";
  const allowed = new Set(COMPANY_MODULES.map((m) => m.key));
  const normalized = keys.filter((k) => allowed.has(k));
  if (normalized.length === 0) return "Diagnostics";
  if (normalized.length === COMPANY_MODULES.length) return "All services";
  return normalized.map((k) => MODULE_LABELS[k] || k).join(" + ");
}

export function modulesFromLegacyType(type) {
  switch (type) {
    case "pathology_lab":
      return ["laboratory"];
    case "diagnostic_center":
      return ["diagnostics"];
    case "hospital":
    case "multi":
      return ["laboratory", "diagnostics"];
    case "pharmacy":
      return ["diagnostics"];
    default:
      return ["diagnostics"];
  }
}

export function normalizeModules(modules) {
  const allowed = new Set(COMPANY_MODULES.map((m) => m.key));
  return [...new Set((modules || []).filter((m) => m !== "clinic" && allowed.has(m)))];
}