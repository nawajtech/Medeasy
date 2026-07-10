// Platform-wide theme engine.
// The 8 editable brand colors are stored in the DB and mapped here to the
// full set of CSS custom properties the app already consumes (see tokens.css).
// Never hardcode colors in components — always read from these variables.

export const DEFAULT_THEME = {
  primary: "#2563EB",
  secondary: "#14B8A6",
  accent: "#6366F1",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  background: "#F8FAFC",
  text: "#0F172A",
};

// UI metadata for the settings page (order + labels + helper copy).
export const THEME_FIELDS = [
  { key: "primary", label: "Primary", hint: "Main brand & primary buttons" },
  { key: "secondary", label: "Secondary", hint: "Secondary actions & highlights" },
  { key: "accent", label: "Accent", hint: "Links, badges & emphasis" },
  { key: "success", label: "Success", hint: "Positive states & confirmations" },
  { key: "warning", label: "Warning", hint: "Cautions & pending states" },
  { key: "error", label: "Error", hint: "Destructive actions & errors" },
  { key: "background", label: "Background", hint: "App canvas / page background" },
  { key: "text", label: "Text", hint: "Primary body text" },
];

const STORAGE_KEY = "medeasy.theme";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex) {
  let value = String(hex || "").trim().replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int) || value.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Positive percent lightens, negative darkens.
export function shade(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const amount = Math.round(2.55 * percent);
  const to = (c) => clamp(c + amount, 0, 255);
  const hexPart = (c) => to(c).toString(16).padStart(2, "0");
  return `#${hexPart(r)}${hexPart(g)}${hexPart(b)}`;
}

// Map the 8 brand colors to every CSS variable the app relies on.
export function buildCssVars(colors) {
  const c = { ...DEFAULT_THEME, ...(colors || {}) };
  return {
    "--me-primary": c.primary,
    "--me-primary-hover": shade(c.primary, -10),
    "--me-primary-soft": rgba(c.primary, 0.08),
    "--me-primary-ring": rgba(c.primary, 0.22),

    "--me-secondary": c.secondary,
    "--me-secondary-soft": rgba(c.secondary, 0.1),

    "--me-accent": c.accent,
    "--me-accent-soft": rgba(c.accent, 0.1),

    "--me-success": c.success,
    "--me-success-soft": rgba(c.success, 0.1),
    "--me-warning": c.warning,
    "--me-warning-soft": rgba(c.warning, 0.1),
    "--me-danger": c.error,
    "--me-danger-soft": rgba(c.error, 0.08),

    "--me-canvas": c.background,
    "--me-surface-muted": c.background,

    "--me-text": c.text,
    "--me-text-secondary": rgba(c.text, 0.72),
    "--me-text-muted": rgba(c.text, 0.55),
    "--me-placeholder": rgba(c.text, 0.4),
    "--me-border": rgba(c.text, 0.12),
    "--me-border-strong": rgba(c.text, 0.2),
  };
}

// Apply to a target element (defaults to :root for global theming).
export function applyTheme(colors, target) {
  const el = target || document.documentElement;
  const vars = buildCssVars(colors);
  Object.entries(vars).forEach(([name, value]) => {
    el.style.setProperty(name, value);
  });
}

export function cacheTheme(colors) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // storage unavailable — ignore
  }
}

export function readCachedTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

// Called before React renders to avoid a flash of the old palette.
export function bootstrapTheme() {
  applyTheme(readCachedTheme() || DEFAULT_THEME);
}
