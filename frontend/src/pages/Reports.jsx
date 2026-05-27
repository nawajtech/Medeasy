import { useCallback, useEffect, useState } from "react";
import "../App.css";
import {
  createReport,
  deleteReport,
  getReports,
  updateReport,
} from "../api/reports";
import { useAuth } from "../auth/AuthContext";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Reports.css";

const REPORT_TYPES = ["appointments", "billing", "patients", "doctors", "custom"];
const STATUSES = ["draft", "published"];

const emptyForm = {
  company_id: "",
  title: "",
  report_type: "custom",
  period_start: "",
  period_end: "",
  summary: "",
  status: "draft",
  mark_generated: false,
};

function Reports() {
  const { isSuperAdmin, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCompanyId, setFilterCompanyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (isSuperAdmin && filterCompanyId) params.company_id = filterCompanyId;
      const { data } = await getReports(params);
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load reports."));
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, filterCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      company_id: String(row.company_id || ""),
      title: row.title || "",
      report_type: row.report_type || "custom",
      period_start: row.period_start?.slice(0, 10) || "",
      period_end: row.period_end?.slice(0, 10) || "",
      summary: row.summary || "",
      status: row.status || "draft",
      mark_generated: false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const buildPayload = () => ({
    company_id: form.company_id || undefined,
    title: form.title,
    report_type: form.report_type,
    period_start: form.period_start || null,
    period_end: form.period_end || null,
    summary: form.summary || null,
    status: form.status,
    mark_generated: form.mark_generated,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      if (editing) {
        await updateReport(editing.id, payload);
      } else {
        await createReport(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save report."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete report "${row.title}"?`)) return;
    setError("");
    try {
      await deleteReport(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete report."));
    }
  };

  return (
    <section className="page-card reports-page">
      <div className="page-card-header">
        <h2>Reports</h2>
        <p>
          {isSuperAdmin
            ? "Reports are per clinic/company. Filter or check the company column."
            : `Reports for ${user?.company?.name || "your clinic"}.`}
        </p>
      </div>

      <div className="crud-toolbar">
        <div className="tenant-toolbar-left">
          <span>{loading ? "Loading…" : `${items.length} report(s)`}</span>
          {isSuperAdmin && (
            <CompanySelect
              variant="inline"
              allowAll
              label="Filter clinic"
              id="report_filter_company_id"
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              required={false}
            />
          )}
        </div>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          Add report
        </button>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Clinic / company</th>
              <th>Title</th>
              <th>Type</th>
              <th>Period</th>
              <th>Status</th>
              <th>Generated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="crud-empty">
                  No reports yet. Click &quot;Add report&quot; to create one.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="tenant-company-badge">{row.company?.name || "—"}</span>
                </td>
                <td>{row.title}</td>
                <td>{row.report_type}</td>
                <td>
                  {row.period_start || row.period_end
                    ? `${row.period_start?.slice(0, 10) || "…"} → ${row.period_end?.slice(0, 10) || "…"}`
                    : "—"}
                </td>
                <td>
                  <span
                    className={`crud-badge ${
                      row.status === "published" ? "crud-badge--active" : "crud-badge--inactive"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td>
                  {row.generated_at
                    ? new Date(row.generated_at).toLocaleString()
                    : "—"}
                </td>
                <td>
                  <div className="crud-actions">
                    <button
                      type="button"
                      className="crud-btn crud-btn--ghost crud-btn--sm"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="crud-btn crud-btn--danger crud-btn--sm"
                      onClick={() => handleDelete(row)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        title={editing ? "Edit report" : "Add report"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            <CompanySelect value={form.company_id} onChange={handleChange} />
            {!isSuperAdmin && user?.company?.name && (
              <div className="crud-field">
                <label>Clinic / company</label>
                <input type="text" value={user.company.name} readOnly disabled />
              </div>
            )}
            <div className="crud-field crud-field--full">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" value={form.title} onChange={handleChange} required />
            </div>
            <div className="crud-field">
              <label htmlFor="report_type">Report type</label>
              <select
                id="report_type"
                name="report_type"
                value={form.report_type}
                onChange={handleChange}
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="period_start">Period start</label>
              <input
                id="period_start"
                name="period_start"
                type="date"
                value={form.period_start}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field">
              <label htmlFor="period_end">Period end</label>
              <input
                id="period_end"
                name="period_end"
                type="date"
                value={form.period_end}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="summary">Summary</label>
              <textarea id="summary" name="summary" value={form.summary} onChange={handleChange} />
            </div>
            <div className="crud-field crud-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="mark_generated"
                  checked={form.mark_generated}
                  onChange={handleChange}
                />
                Mark as generated now
              </label>
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default Reports;
