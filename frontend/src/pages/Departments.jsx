import { useCallback, useEffect, useState } from "react";
import "../App.css";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
} from "../api/departments";
import { useAuth } from "../auth/AuthContext";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Departments.css";

const emptyForm = {
  company_id: "",
  name: "",
  code: "",
  description: "",
  is_active: true,
};

function Departments() {
  const { isDoctor, isSuperAdmin, user } = useAuth();
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
      const { data } = await getDepartments(params);
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load departments."));
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
      name: row.name || "",
      company_id: String(row.company_id || ""),
      code: row.code || "",
      description: row.description || "",
      is_active: Boolean(row.is_active),
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateDepartment(editing.id, form);
      } else {
        await createDepartment(form);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save department."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete department "${row.name}"?`)) return;
    setError("");
    try {
      await deleteDepartment(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete department."));
    }
  };

  return (
    <section className="page-card departments-page">
      <div className="page-card-header">
        <h2>Departments / Specialities</h2>
        <p>
          {isSuperAdmin
            ? "Departments belong to a clinic. Each company has its own speciality list."
            : `Departments for ${user?.company?.name || "your clinic"}.`}
        </p>
      </div>

      <div className="crud-toolbar">
        <div className="tenant-toolbar-left">
          <span>{loading ? "Loading…" : `${items.length} department(s)`}</span>
          {isSuperAdmin && (
            <CompanySelect
              variant="inline"
              allowAll
              label="Filter clinic"
              id="dept_filter_company_id"
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              required={false}
            />
          )}
        </div>
        {!isDoctor && (
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
            Add department
          </button>
        )}
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Clinic / company</th>
              <th>Name</th>
              <th>Code</th>
              <th>Doctors</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="crud-empty">
                  No departments yet.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="tenant-company-badge">{row.company?.name || "—"}</span>
                </td>
                <td>{row.name}</td>
                <td>{row.code || "—"}</td>
                <td>{row.doctors_count ?? 0}</td>
                <td>
                  <span
                    className={`crud-badge ${
                      row.is_active ? "crud-badge--active" : "crud-badge--inactive"
                    }`}
                  >
                    {row.is_active ? "Active" : "Inactive"}
                  </span>
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
        title={editing ? "Edit department" : "Add department"}
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
            <div className="crud-field">
              <label htmlFor="name">Department / speciality name</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Enter department name" />
            </div>
            <div className="crud-field">
              <label htmlFor="code">Code (optional)</label>
              <input id="code" name="code" value={form.code} onChange={handleChange} placeholder="Enter code (optional)" />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter description (optional)"
              />
            </div>
            <div className="crud-field crud-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                />
                Active
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

export default Departments;
