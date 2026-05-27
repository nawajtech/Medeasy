import { useCallback, useEffect, useState } from "react";
import "../App.css";
import {
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
} from "../api/companies";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Companies.css";

const emptyForm = {
  name: "",
  code: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "",
  website: "",
  description: "",
  is_active: true,
};

function Companies() {
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
      const { data } = await getCompanies();
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load companies."));
    } finally {
      setLoading(false);
    }
  }, []);

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
      code: row.code || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      city: row.city || "",
      state: row.state || "",
      country: row.country || "",
      website: row.website || "",
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
        await updateCompany(editing.id, form);
      } else {
        await createCompany(form);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save company."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete clinic "${row.name}"?`)) return;
    setError("");
    try {
      await deleteCompany(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete company."));
    }
  };

  const location = (row) => {
    const parts = [row.city, row.state, row.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  };

  return (
    <section className="page-card companies-page">
      <div className="page-card-header">
        <h2>Companies / Clinics</h2>
        <p>
          Manage clinic organizations such as Apollo Clinic, Riyaj Clinic, and other branches.
        </p>
      </div>

      <div className="crud-toolbar">
        <span>{loading ? "Loading…" : `${items.length} clinic(s)`}</span>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          Add clinic
        </button>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Clinic name</th>
              <th>Code</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="crud-empty">
                  No clinics yet. Add Apollo Clinic, Riyaj Clinic, or your own.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                </td>
                <td>{row.code || "—"}</td>
                <td>{row.phone || "—"}</td>
                <td>{row.email || "—"}</td>
                <td>{location(row)}</td>
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
        title={editing ? "Edit clinic" : "Add clinic"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label htmlFor="name">Clinic / company name</label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Apollo Clinic"
                required
              />
            </div>
            <div className="crud-field">
              <label htmlFor="code">Code (optional)</label>
              <input
                id="code"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. APOLLO"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="address">Address</label>
              <input id="address" name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="city">City</label>
              <input id="city" name="city" value={form.city} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="state">State / province</label>
              <input id="state" name="state" value={form.state} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="country">Country</label>
              <input id="country" name="country" value={form.country} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="website">Website</label>
              <input id="website" name="website" value={form.website} onChange={handleChange} />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
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

export default Companies;
