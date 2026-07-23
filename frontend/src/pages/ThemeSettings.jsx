import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { DEFAULT_THEME, THEME_FIELDS, buildCssVars } from "../theme/theme";
import { getApiErrorMessage } from "../utils/apiError";
import "./ThemeSettings.css";

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

function normalizeHex(value) {
  let v = String(value || "").trim();
  if (!v.startsWith("#")) v = `#${v}`;
  return v;
}

export default function ThemeSettings() {
  const { isSuperAdmin } = useAuth();
  const { theme, previewTheme, saveTheme } = useTheme();

  const [draft, setDraft] = useState(() => ({ ...DEFAULT_THEME, ...theme }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const previewStyle = useMemo(() => buildCssVars(draft), [draft]);
  const isDirty = useMemo(
    () => THEME_FIELDS.some((f) => (draft[f.key] || "") !== (theme[f.key] || "")),
    [draft, theme]
  );

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const setColor = (key, value) => {
    setMessage(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const invalidKeys = THEME_FIELDS.filter((f) => !HEX_RE.test(draft[f.key] || "")).map(
    (f) => f.key
  );

  const handleSave = async () => {
    if (invalidKeys.length) {
      setMessage({ type: "error", text: "Please enter valid 6-digit hex colors." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveTheme(draft);
      setMessage({ type: "success", text: "Theme saved and applied across the app." });
    } catch (err) {
      setMessage({ type: "error", text: getApiErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_THEME });
    setMessage({ type: "info", text: "Reverted to the default palette. Click Save to apply." });
  };

  const handlePreview = () => {
    if (invalidKeys.length) {
      setMessage({ type: "error", text: "Fix invalid colors before previewing." });
      return;
    }
    previewTheme(draft);
    setMessage({ type: "info", text: "Previewing live — Save to keep these colors." });
  };

  return (
    <div className="theme-page">
      <header className="theme-page__head">
        <div>
          <p className="theme-page__eyebrow">Settings → Appearance</p>
          <h1>Theme Settings</h1>
          <p className="theme-page__sub">
            Customize the platform palette. Changes apply everywhere through CSS variables —
            no hardcoded colors.
          </p>
        </div>
        <div className="theme-page__actions">
          <button type="button" className="btn-ghost" onClick={handleReset}>
            Reset to Default
          </button>
          <button type="button" className="btn-secondary" onClick={handlePreview}>
            Preview
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {message && <div className={`theme-alert theme-alert--${message.type}`}>{message.text}</div>}

      <div className="theme-grid">
        <section className="theme-card theme-pickers">
          <h2 className="theme-card__title">Brand colors</h2>
          <div className="theme-fields">
            {THEME_FIELDS.map((field) => {
              const value = draft[field.key] || "";
              const valid = HEX_RE.test(value);
              return (
                <div className="theme-field" key={field.key}>
                  <label htmlFor={`color-${field.key}`}>
                    <span className="theme-field__label">{field.label}</span>
                    <span className="theme-field__hint">{field.hint}</span>
                  </label>
                  <div className={`theme-field__control ${valid ? "" : "is-invalid"}`}>
                    <input
                      id={`color-${field.key}`}
                      type="color"
                      value={valid ? value : "#000000"}
                      onChange={(e) => setColor(field.key, e.target.value.toUpperCase())}
                      aria-label={`${field.label} color picker`}
                    />
                    <input
                      type="text"
                      className="theme-field__hex"
                      value={value}
                      spellCheck={false}
                      maxLength={7}
                      onChange={(e) => setColor(field.key, normalizeHex(e.target.value))}
                      onBlur={(e) => setColor(field.key, normalizeHex(e.target.value).toUpperCase())}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="theme-card theme-preview" style={previewStyle}>
          <h2 className="theme-card__title">Live preview</h2>

          <div className="tp-shell">
            <aside className="tp-sidebar">
              <div className="tp-brand">ApnaMedi</div>
              <nav>
                <span className="tp-nav is-active">Dashboard</span>
                <span className="tp-nav">Patients</span>
                <span className="tp-nav">Reports</span>
              </nav>
            </aside>

            <div className="tp-main">
              <header className="tp-navbar">
                <span className="tp-navbar__title">Overview</span>
                <span className="tp-avatar">DR</span>
              </header>

              <div className="tp-buttons">
                <button type="button" className="tp-btn tp-btn--primary">Primary</button>
                <button type="button" className="tp-btn tp-btn--secondary">Secondary</button>
                <button type="button" className="tp-btn tp-btn--accent">Accent</button>
                <button type="button" className="tp-btn tp-btn--ghost">Ghost</button>
              </div>

              <div className="tp-cards">
                <div className="tp-card">
                  <span className="tp-card__label">Patients</span>
                  <strong className="tp-card__value">1,284</strong>
                </div>
                <div className="tp-card">
                  <span className="tp-card__label">Revenue</span>
                  <strong className="tp-card__value">$92k</strong>
                </div>
              </div>

              <div className="tp-alerts">
                <div className="tp-alert tp-alert--success">Payment received successfully.</div>
                <div className="tp-alert tp-alert--warning">Subscription renews in 3 days.</div>
                <div className="tp-alert tp-alert--error">2 lab reports failed to sync.</div>
              </div>

              <form className="tp-form" onSubmit={(e) => e.preventDefault()}>
                <label className="tp-label">Patient name</label>
                <input className="tp-input" placeholder="Jane Doe" />
                <button type="submit" className="tp-btn tp-btn--primary tp-btn--block">
                  Save patient
                </button>
              </form>

              <table className="tp-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ravi Kumar</td>
                    <td><span className="tp-badge tp-badge--success">Paid</span></td>
                    <td>$120</td>
                  </tr>
                  <tr>
                    <td>Anita Shah</td>
                    <td><span className="tp-badge tp-badge--warning">Pending</span></td>
                    <td>$80</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
