import { Link } from "react-router-dom";
import { titleCase } from "../utils/format";

export function PageHeader({ eyebrow = "Partner Portal", title, subtitle, actions }) {
  return (
    <header className="pt-page-header">
      <div className="pt-page-header__copy">
        {eyebrow ? <p className="pt-page-header__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="pt-page-header__sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="pt-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function Toolbar({ children }) {
  return <div className="pt-toolbar">{children}</div>;
}

export function StatGrid({ children }) {
  return <div className="pt-stat-grid">{children}</div>;
}

export function StatCard({ label, value, tone = "default", to }) {
  const className = `pt-stat pt-stat--${tone}`;
  if (to) {
    return (
      <Link to={to} className={className}>
        <strong>{value}</strong>
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <div className={className}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Section({ title, subtitle, action, children }) {
  return (
    <section className="pt-section">
      <div className="pt-section__head">
        <div>
          {title ? <h2>{title}</h2> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action || null}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ status }) {
  const key = String(status || "unknown").toLowerCase();
  return <span className={`pt-status-badge pt-status-badge--${key}`}>{titleCase(key)}</span>;
}

export function Alert({ type = "error", children }) {
  if (!children) return null;
  return <div className={`pt-alert pt-alert--${type}`}>{children}</div>;
}

export function LoadingBlock({ label = "Loading…" }) {
  return (
    <div className="pt-loading-block">
      <div className="pt-spinner" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="pt-empty-state">
      <strong>{title}</strong>
      {text ? <p>{text}</p> : null}
      {action || null}
    </div>
  );
}

export function CardList({ children }) {
  return <div className="pt-card-list">{children}</div>;
}

export function ListRow({ title, meta, right, to }) {
  const body = (
    <>
      <div className="pt-card-row__main">
        <strong>{title}</strong>
        {meta ? <div className="pt-card-row__meta">{meta}</div> : null}
      </div>
      {right ? <div className="pt-card-row__right">{right}</div> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className="pt-card-row">
        {body}
      </Link>
    );
  }

  return <div className="pt-card-row">{body}</div>;
}

export function Panel({ title, subtitle, children, footer }) {
  return (
    <section className="pt-surface-panel">
      {(title || subtitle) && (
        <div className="pt-surface-panel__head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
      )}
      <div className="pt-surface-panel__body">{children}</div>
      {footer ? <div className="pt-surface-panel__footer">{footer}</div> : null}
    </section>
  );
}

export function FormGrid({ children, columns = 1 }) {
  return (
    <div className={`pt-form-grid${columns === 2 ? " pt-form-grid--2" : ""}`}>{children}</div>
  );
}

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="pt-auth">
      <div className="pt-auth__bg" aria-hidden="true" />
      <div className="pt-auth__shell">
        <div className="pt-auth__card">
          <img src="/apnamedi-logo.png" alt="ApnaMedi" className="pt-logo pt-logo--lg" />
          <p className="pt-auth__eyebrow">ApnaMedi Partner Portal</p>
          <h1>{title}</h1>
          {subtitle ? <p className="pt-page-sub">{subtitle}</p> : null}
          {children}
          {footer ? <div className="pt-auth__footer">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function Stepper({ step, steps }) {
  return (
    <ol className="pt-stepper" aria-label="Progress">
      {steps.map((label, index) => {
        const n = index + 1;
        const state = n < step ? "done" : n === step ? "current" : "";
        return (
          <li key={label} className={state || undefined}>
            <span>{n}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
