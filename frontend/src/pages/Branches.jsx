import { useCallback, useEffect, useState } from "react";
import { getBranches, createBranch, updateBranch, deleteBranch } from "../api/branches";
import Modal from "../components/crud/Modal";
import CompanySelect from "../components/CompanySelect";
import { useAuth } from "../auth/AuthContext";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";

const emptyForm = {
  company_id: "",
  name: "",
  code: "",
  address: "",
  city: "",
  phone: "",
  email: "",
  is_main: false,
  is_active: true,
};

function Branches() {
  const { isSuperAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getBranches();
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load branches."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      company_id: row.company_id || "",
      name: row.name || "",
      code: row.code || "",
      address: row.address || "",
      city: row.city || "",
      phone: row.phone || "",
      email: row.email || "",
      is_main: Boolean(row.is_main),
      is_active: Boolean(row.is_active),
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(emptyForm); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateBranch(editing.id, form);
      } else {
        await createBranch(form);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save branch."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete branch "${row.name}"?`)) return;
    try {
      await deleteBranch(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete branch."));
    }
  };

  return (
    <section className="page-card">
      <div className="page-card-header">
        <h2>Branches</h2>
        <p>Manage multiple branches or locations for your organization.</p>
      </div>

      <div className="crud-toolbar">
        <span>{loading ? "Loading…" : `${items.length} branch(es)`}</span>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          Add branch
        </button>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Branch name</th>
              <th>City</th>
              <th>Doctors</th>
              <th>Appointments</th>
              <th>Main branch</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} className="crud-empty">No branches yet.</td></tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  {row.code ? <span style={{ marginLeft: 6, color: "var(--me-text-muted)", fontSize: "0.8rem" }}>({row.code})</span> : ""}
                  {row.address && <div style={{ fontSize: "0.8rem", color: "var(--me-text-muted)", marginTop: 2 }}>{row.address}{row.city ? `, ${row.city}` : ""}</div>}
                </td>
                <td>{row.city || "—"}</td>
                <td>
                  <span className="branch-count-badge">{row.doctors_count ?? 0}</span>
                </td>
                <td>
                  <span className="branch-count-badge">{row.appointments_count ?? 0}</span>
                </td>
                <td>{row.is_main ? <span className="crud-badge crud-badge--active">Main</span> : "—"}</td>
                <td>
                  <span className={`crud-badge ${row.is_active ? "crud-badge--active" : "crud-badge--inactive"}`}>
                    {row.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleDelete(row)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal title={editing ? "Edit branch" : "Add branch"} open={modalOpen} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            {isSuperAdmin && (
              <div className="crud-field crud-field--full">
                <label htmlFor="branch_company_id">Organization</label>
                <CompanySelect
                  id="branch_company_id"
                  name="company_id"
                  value={form.company_id}
                  onChange={handleChange}
                  required
                />
              </div>
            )}
            <div className="crud-field">
              <label htmlFor="branch_name">Branch name *</label>
              <input id="branch_name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Main Branch, North Wing" />
            </div>
            <div className="crud-field">
              <label htmlFor="branch_code">Code</label>
              <input id="branch_code" name="code" value={form.code} onChange={handleChange} placeholder="e.g. NORTH" />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="branch_address">Address</label>
              <input id="branch_address" name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="branch_city">City</label>
              <input id="branch_city" name="city" value={form.city} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="branch_phone">Phone</label>
              <input id="branch_phone" name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="branch_email">Email</label>
              <input id="branch_email" name="email" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label className="crud-checkbox">
                <input type="checkbox" name="is_main" checked={form.is_main} onChange={handleChange} />
                Main branch
              </label>
            </div>
            <div className="crud-field">
              <label className="crud-checkbox">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                Active
              </label>
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={closeModal}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default Branches;
