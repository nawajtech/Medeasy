import { useCallback, useEffect, useState } from "react";
import "../App.css";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../api/users";
import { useAuth } from "../auth/AuthContext";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Users.css";

const emptyForm = {
  company_id: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "staff",
  status: true,
};

const ROLES = ["company_admin", "staff"];

function Users() {
  const { isSuperAdmin } = useAuth();
  const roleOptions = isSuperAdmin ? ROLES : ["staff"];
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
      const { data } = await getUsers();
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load users."));
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

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      company_id: String(user.company_id || ""),
      role: user.role || "staff",
      status: Boolean(user.status),
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
    const payload = { ...form };
    if (editing && !payload.password) delete payload.password;

    try {
      if (editing) {
        await updateUser(editing.id, payload);
      } else {
        await createUser(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save user."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    setError("");
    try {
      await deleteUser(user.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete user."));
    }
  };

  return (
    <section className="page-card users-page">
      <div className="page-card-header">
        <h2>Users</h2>
        <p>Manage system users, roles, and account status.</p>
      </div>

      <div className="crud-toolbar">
        <span>{loading ? "Loading…" : `${items.length} user(s)`}</span>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          Add user
        </button>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="crud-empty">
                  No users yet. Click &quot;Add user&quot; to create one.
                </td>
              </tr>
            )}
            {items.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone || "—"}</td>
                <td>{user.role}</td>
                <td>
                  <span
                    className={`crud-badge ${
                      user.status ? "crud-badge--active" : "crud-badge--inactive"
                    }`}
                  >
                    {user.status ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="crud-actions">
                    <button
                      type="button"
                      className="crud-btn crud-btn--ghost crud-btn--sm"
                      onClick={() => openEdit(user)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="crud-btn crud-btn--danger crud-btn--sm"
                      onClick={() => handleDelete(user)}
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
        title={editing ? "Edit user" : "Add user"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            <CompanySelect value={form.company_id} onChange={handleChange} />
            <div className="crud-field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="crud-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="crud-field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" value={form.role} onChange={handleChange} required>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="password">
                Password{editing ? " (leave blank to keep)" : ""}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required={!editing}
                minLength={8}
              />
            </div>
            <div className="crud-field crud-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="status"
                  checked={form.status}
                  onChange={handleChange}
                />
                Active account
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

export default Users;
