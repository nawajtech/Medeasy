import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import { createRole, deleteRole, getRoles, updateRole } from "../api/roles";
import { useAuth } from "../auth/AuthContext";
import Can from "../components/Can";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Roles.css";

const emptyForm = { name: "", description: "" };

function Roles() {
  const { user } = useAuth();
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
      const { data } = await getRoles();
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load roles."));
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

  const openEdit = (role) => {
    setEditing(role);
    setForm({ name: role.name, description: role.description || "" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateRole(editing.id, form);
      } else {
        await createRole(form);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save role."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete role "${role.label || role.name}"?`)) return;
    setError("");
    try {
      await deleteRole(role.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete role."));
    }
  };

  return (
    <section className="page-card roles-page">
      <div className="page-card-header">
        <h2>Roles</h2>
        <p>
          Manage roles and permissions for{" "}
          <strong>{user?.company?.name || "your organization"}</strong>.
          Each company has its own independent roles.
        </p>
      </div>

      <div className="crud-toolbar">
        <span>{loading ? "Loading…" : `${items.length} role(s)`}</span>
        <Can permission="role.create">
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
            Add role
          </button>
        </Can>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="roles-grid">
        {!loading && items.length === 0 && (
          <p className="crud-empty">No roles found.</p>
        )}
        {items.map((role) => (
          <article key={role.id} className="role-card">
            <div className="role-card-header">
              <h3>{role.label}</h3>
              {role.is_system && <span className="role-badge role-badge--system">System</span>}
            </div>
            <p className="role-card-desc">{role.description || "No description."}</p>
            <p className="role-card-meta">
              <code>{role.name}</code>
              <span>{role.permissions_count} permission(s)</span>
            </p>
            <div className="role-card-actions">
              <Can permission="role.assign_permissions">
                <Link to={`/roles/${role.id}`} className="crud-btn crud-btn--secondary">
                  Permissions
                </Link>
              </Can>
              <Can permission="role.edit">
                <button type="button" className="crud-btn crud-btn--ghost" onClick={() => openEdit(role)}>
                  Edit
                </button>
              </Can>
              <Can permission="role.delete">
                {!role.is_system && (
                  <button type="button" className="crud-btn crud-btn--danger" onClick={() => handleDelete(role)}>
                    Delete
                  </button>
                )}
              </Can>
            </div>
          </article>
        ))}
      </div>

      <Modal open={modalOpen} title={editing ? "Edit role" : "Create role"} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="crud-form">
          <label>
            Role slug
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. nurse"
              pattern="[a-z][a-z0-9_]*"
              required
              disabled={Boolean(editing?.is_system)}
            />
            <small>Lowercase letters, numbers, underscores. Used internally.</small>
          </label>
          <label>
            Description
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Enter description (optional)" />
          </label>
          <div className="crud-form-actions">
            <button type="button" className="crud-btn" onClick={closeModal}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default Roles;
