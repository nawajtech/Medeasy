import { useCallback, useEffect, useState } from "react";
import {
  exportAuditLogs,
  getAuditActors,
  getAuditFilters,
  getAuditLog,
  getAuditLogs,
} from "../api/audit";
import { AuditDetailBody } from "../components/audit/AuditTimeline";
import Modal from "../components/crud/Modal";
import CompanySelect from "../components/CompanySelect";
import BranchSelect from "../components/BranchSelect";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./AuditTrail.css";

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

function AuditTrail() {
  const { isSuperAdmin } = useAuth();
  const { can } = usePermissions();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    company_id: "",
    branch_id: "",
    user_id: "",
    module: "",
    action: "",
    search: "",
    date_from: "",
    date_to: "",
  });

  const [moduleOptions, setModuleOptions] = useState([]);
  const [actionOptions, setActionOptions] = useState([]);
  const [actors, setActors] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        ...filters,
        company_id: filters.company_id || undefined,
        branch_id: filters.branch_id || undefined,
        user_id: filters.user_id || undefined,
        module: filters.module || undefined,
        action: filters.action || undefined,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      };
      const { data } = await getAuditLogs(params);
      setLogs(data.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load audit trail."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const params = isSuperAdmin && filters.company_id ? { company_id: filters.company_id } : {};
    getAuditFilters(params).then(({ data }) => {
      setModuleOptions(data.modules || []);
      setActionOptions(data.actions || []);
    }).catch(() => {});
    getAuditActors(params).then(({ data }) => setActors(data || [])).catch(() => setActors([]));
  }, [isSuperAdmin, filters.company_id]);

  const openDetail = async (log) => {
    setDetailOpen(true);
    setDetailLog(log);
    setDetailLoading(true);
    try {
      const { data } = await getAuditLog(log.id);
      setDetailLog(data);
    } catch {
      /* keep list row */
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    try {
      await exportAuditLogs({
        ...filters,
        company_id: filters.company_id || undefined,
        branch_id: filters.branch_id || undefined,
        user_id: filters.user_id || undefined,
        module: filters.module || undefined,
        action: filters.action || undefined,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Export failed."));
    } finally {
      setExporting(false);
    }
  };

  const setFilter = (key, value) => setFilters((p) => ({ ...p, [key]: value }));

  return (
    <section className="page-card audit-trail-page">
      <div className="page-card-header">
        <h2>Audit Trail</h2>
        <p>Complete activity log for your organization — who did what, when, and what changed.</p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-toolbar audit-trail-toolbar">
        <div className="audit-trail-filters">
          {isSuperAdmin && (
            <CompanySelect
              id="audit_company"
              label=""
              value={filters.company_id}
              onChange={(e) => setFilter("company_id", e.target.value)}
              allowAll
              variant="inline"
              required={false}
            />
          )}
          <BranchSelect
            value={filters.branch_id}
            onChange={(e) => setFilter("branch_id", e.target.value)}
            allLabel="All branches"
            id="audit_branch"
            name="audit_branch"
          />
          <select
            className="crud-btn crud-btn--ghost"
            value={filters.user_id}
            onChange={(e) => setFilter("user_id", e.target.value)}
            aria-label="User"
          >
            <option value="">All users</option>
            {actors.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            className="crud-btn crud-btn--ghost"
            value={filters.module}
            onChange={(e) => setFilter("module", e.target.value)}
            aria-label="Module"
          >
            <option value="">All modules</option>
            {moduleOptions.map((m) => (
              <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>
            ))}
          </select>
          <select
            className="crud-btn crud-btn--ghost"
            value={filters.action}
            onChange={(e) => setFilter("action", e.target.value)}
            aria-label="Action"
          >
            <option value="">All actions</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilter("date_from", e.target.value)}
            aria-label="From date"
            placeholder="From date"
          />
          <span>–</span>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilter("date_to", e.target.value)}
            aria-label="To date"
            placeholder="To date"
          />
          <input
            type="search"
            className="audit-trail-search"
            placeholder="Search user, record…"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        {can("audit.export") && (
          <button
            type="button"
            className="crud-btn crud-btn--primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        )}
      </div>

      <div className="crud-table-wrap">
        <table className="crud-table audit-trail-table">
          <thead>
            <tr>
              <th>When</th>
              <th>User</th>
              <th>Action</th>
              <th>Module</th>
              <th>Record</th>
              <th>Branch</th>
              <th>IP / Device</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!loading && logs.length === 0 && (
              <tr><td colSpan={8} className="crud-empty">No audit entries found.</td></tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="audit-trail-date">{formatDate(log.created_at)}</td>
                <td>
                  <strong>{log.user_name || "System"}</strong>
                  {log.user_email && <div className="crud-muted audit-trail-email">{log.user_email}</div>}
                </td>
                <td><span className={`audit-pill audit-pill--${log.action}`}>{log.action}</span></td>
                <td>{MODULE_LABELS[log.module] || log.module}</td>
                <td>{log.auditable_label || "—"}</td>
                <td>{log.branch?.name || "—"}</td>
                <td className="audit-trail-meta">
                  {log.ip_address || "—"}
                  {log.device && <span className="crud-muted"> · {log.device} / {log.browser}</span>}
                </td>
                <td>
                  <button
                    type="button"
                    className="crud-btn crud-btn--ghost crud-btn--sm"
                    onClick={() => openDetail(log)}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        title="Audit entry details"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        wide
      >
        {detailLoading ? (
          <p className="crud-muted">Loading…</p>
        ) : (
          <AuditDetailBody log={detailLog} />
        )}
        <div className="crud-modal-actions">
          <button type="button" className="crud-btn crud-btn--primary" onClick={() => setDetailOpen(false)}>
            Close
          </button>
        </div>
      </Modal>
    </section>
  );
}

export default AuditTrail;
