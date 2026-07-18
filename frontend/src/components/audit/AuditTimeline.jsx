import { useCallback, useEffect, useState } from "react";
import { getRelatedAuditLogs } from "../../api/audit";
import { getApiErrorMessage } from "../../utils/apiError";
import "./AuditTimeline.css";

const ACTION_LABELS = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  login: "Logged in",
  logout: "Logged out",
  print: "Printed",
  download: "Downloaded",
  approve: "Approved",
};

const MODULE_LABELS = {
  patients: "Patients",
  appointments: "Appointments",
  billing: "Billing",
  lab: "Laboratory",
  diagnostics: "Diagnostics",
  users: "Users",
  roles: "Roles",
  settings: "Settings",
  auth: "Authentication",
  finance: "Finance",
  doctors: "Doctors",
  departments: "Departments",
  branches: "Branches",
  reports: "Reports",
  medicine: "Medicine",
  companies: "Companies",
  subscription: "Subscription",
  documents: "Documents",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChangeDiff({ oldValues, newValues }) {
  const keys = [...new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {}),
  ])];

  if (!keys.length) return null;

  return (
    <div className="audit-diff">
      {keys.map((key) => (
        <div key={key} className="audit-diff-row">
          <span className="audit-diff-key">{key}</span>
          <span className="audit-diff-old">{formatVal(oldValues?.[key])}</span>
          <span className="audit-diff-arrow">→</span>
          <span className="audit-diff-new">{formatVal(newValues?.[key])}</span>
        </div>
      ))}
    </div>
  );
}

function formatVal(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function AuditDetailBody({ log }) {
  if (!log) return null;
  return (
    <div className="audit-detail-body">
      <dl className="audit-detail-grid">
        <div><dt>User</dt><dd>{log.user_name || "System"}</dd></div>
        <div><dt>Action</dt><dd>{ACTION_LABELS[log.action] || log.action}</dd></div>
        <div><dt>Module</dt><dd>{MODULE_LABELS[log.module] || log.module}</dd></div>
        <div><dt>Record</dt><dd>{log.auditable_label || "—"}</dd></div>
        <div><dt>When</dt><dd>{formatDate(log.created_at)}</dd></div>
        <div><dt>IP</dt><dd>{log.ip_address || "—"}</dd></div>
        <div><dt>Device</dt><dd>{log.device || "—"}</dd></div>
        <div><dt>Browser</dt><dd>{log.browser || "—"}</dd></div>
      </dl>
      {(log.old_values || log.new_values) && (
        <div className="audit-detail-changes">
          <h4>Changes</h4>
          <ChangeDiff oldValues={log.old_values} newValues={log.new_values} />
        </div>
      )}
    </div>
  );
}

export default function AuditTimeline({
  patientId,
  labOrderId,
  diagnosticOrderId,
  billingId,
  limit = 30,
  compact = false,
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { per_page: limit };
      if (patientId) params.patient_id = patientId;
      if (labOrderId) params.lab_order_id = labOrderId;
      if (diagnosticOrderId) params.diagnostic_order_id = diagnosticOrderId;
      if (billingId) params.billing_id = billingId;
      const { data } = await getRelatedAuditLogs(params);
      setLogs(data.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load activity."));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, labOrderId, diagnosticOrderId, billingId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="crud-muted">Loading activity…</p>;
  if (error) return <p className="crud-alert crud-alert--error">{error}</p>;
  if (!logs.length) return <p className="crud-muted">No activity recorded yet.</p>;

  return (
    <div className={`audit-timeline${compact ? " audit-timeline--compact" : ""}`}>
      {logs.map((log) => {
        const expanded = expandedId === log.id;
        return (
          <article key={log.id} className="audit-timeline-item">
            <div className="audit-timeline-head">
              <span className={`audit-timeline-action audit-timeline-action--${log.action}`}>
                {ACTION_LABELS[log.action] || log.action}
              </span>
              <time>{formatDate(log.created_at)}</time>
            </div>
            <p className="audit-timeline-summary">
              <strong>{log.user_name || "System"}</strong>
              {" "}{ACTION_LABELS[log.action]?.toLowerCase() || log.action}
              {" "}
              <span className="audit-timeline-record">
                {MODULE_LABELS[log.module] || log.module}
                {log.auditable_label ? ` — ${log.auditable_label}` : ""}
              </span>
            </p>
            {(log.old_values || log.new_values) && (
              <button
                type="button"
                className="crud-btn crud-btn--ghost crud-btn--sm"
                onClick={() => setExpandedId(expanded ? null : log.id)}
              >
                {expanded ? "Hide changes" : "View changes"}
              </button>
            )}
            {expanded && <ChangeDiff oldValues={log.old_values} newValues={log.new_values} />}
          </article>
        );
      })}
    </div>
  );
}
