import { useCallback, useEffect, useState } from "react";
import "../App.css";
import {
  createSetting,
  deleteSetting,
  getSettings,
  updateSetting,
} from "../api/settings";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Settings.css";

const GROUPS = ["general", "billing", "appointments", "notifications"];

const emptyForm = {
  key: "",
  value: "",
  label: "",
  group: "general",
};

function Settings() {
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
      const { data } = await getSettings();
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load settings."));
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
      key: row.key || "",
      value: row.value || "",
      label: row.label || "",
      group: row.group || "general",
    });
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
        await updateSetting(editing.id, form);
      } else {
        await createSetting(form);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save setting."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete setting "${row.key}"?`)) return;
    setError("");
    try {
      await deleteSetting(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete setting."));
    }
  };

  return (
    <section className="page-card settings-page">
      <div className="page-card-header">
        <h2>Settings</h2>
        <p>Manage clinic configuration and system preferences.</p>
      </div>

      <div className="crud-toolbar">
        <span>{loading ? "Loading…" : `${items.length} setting(s)`}</span>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          Add setting
        </button>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Label</th>
              <th>Value</th>
              <th>Group</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="crud-empty">
                  No settings yet. Click &quot;Add setting&quot; to create one.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <code>{row.key}</code>
                </td>
                <td>{row.label || "—"}</td>
                <td>{row.value || "—"}</td>
                <td>{row.group}</td>
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
        title={editing ? "Edit setting" : "Add setting"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label htmlFor="key">Key</label>
              <input
                id="key"
                name="key"
                value={form.key}
                onChange={handleChange}
                required
                disabled={Boolean(editing)}
                placeholder="e.g. clinic_name"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="group">Group</label>
              <select id="group" name="group" value={form.group} onChange={handleChange}>
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="label">Label</label>
              <input id="label" name="label" value={form.label} onChange={handleChange} />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="value">Value</label>
              <textarea id="value" name="value" value={form.value} onChange={handleChange} />
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

export default Settings;
