import { useCallback, useEffect, useState } from "react";
import "../App.css";
import {
  createUser,
  deleteUser,
  getUserAssignableRoles,
  getUsers,
  updateUser,
} from "../api/users";
import { useAuth } from "../auth/AuthContext";
import BranchSelect from "../components/BranchSelect";
import Can from "../components/Can";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Users.css";

const emptyForm = {
  company_id: "",
  branch_id: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "staff",
  status: true,
};

const ROLES = ["company_admin", "staff", "nurse", "lab_technician", "radiologist", "receptionist", "pharmacist", "accountant"];

function Users() {
  const { isSuperAdmin } = useAuth();
  const [roleOptions, setRoleOptions] = useState(ROLES);
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

  const loadRoleOptions = useCallback(async (companyId) => {
    try {
      const { data } = await getUserAssignableRoles(companyId || undefined);
      const names = data.map((r) => r.name);
      if (names.length) {
        setRoleOptions(names);
        setForm((prev) => ({
          ...prev,
          role: names.includes(prev.role) ? prev.role : names[0],
        }));
      }
    } catch {
      /* keep current options */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isSuperAdmin) {
      if (form.company_id) {
        loadRoleOptions(form.company_id);
      }
      return;
    }
    loadRoleOptions();
  }, [isSuperAdmin, form.company_id, loadRoleOptions]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
    if (!isSuperAdmin) {
      loadRoleOptions();
    }
  };

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      company_id: String(user.company_id || ""),
      branch_id: String(user.branch_id || ""),
      role: user.role || "staff",
      status: Boolean(user.status),
    });
    setModalOpen(true);
    loadRoleOptions(user.company_id || undefined);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };
      if (name === "company_id" && isSuperAdmin) {
        next.role = "";
      }
      return next;
    });
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
        <Can permission="users.create">
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
            Add user
          </button>
        </Can>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Branch</th>
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
                <td>
                  <div>{user.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--me-text-muted)" }}>{user.phone || ""}</div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className="crud-badge" style={{ background: "var(--me-surface-2)", color: "var(--me-text)" }}>
                    {user.role?.replace(/_/g, " ")}
                  </span>
                </td>
                <td>
                  {user.branch
                    ? <span className="branch-pill">{user.branch.name}</span>
                    : <span style={{ color: "var(--me-text-muted)" }}>—</span>}
                </td>
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
                    <Can permission="users.edit">
                      <button
                        type="button"
                        className="crud-btn crud-btn--ghost crud-btn--sm"
                        onClick={() => openEdit(user)}
                      >
                        Edit
                      </button>
                    </Can>
                    <Can permission="users.delete">
                      <button
                        type="button"
                        className="crud-btn crud-btn--danger crud-btn--sm"
                        onClick={() => handleDelete(user)}
                      >
                        Delete
                      </button>
                    </Can>
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
              <label htmlFor="user_branch_id">Branch</label>
              <BranchSelect
                id="user_branch_id"
                name="branch_id"
                value={form.branch_id}
                onChange={handleChange}
                companyId={form.company_id}
                allLabel="No branch assigned"
              />
            </div>
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
              <select id="role" name="role" value={form.role} onChange={handleChange} required disabled={isSuperAdmin && !form.company_id}>
                {roleOptions.length === 0 ? (
                  <option value="">{isSuperAdmin && !form.company_id ? "Select company first" : "No roles available"}</option>
                ) : (
                  roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))
                )}
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
