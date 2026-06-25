import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../App.css";
import { getPermissions, getRole, syncRolePermissions } from "../api/roles";
import { useAuth } from "../auth/AuthContext";
import Can from "../components/Can";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./RolePermissions.css";

function RolePermissions() {
  const { user } = useAuth();
  const { roleId } = useParams();
  const [role, setRole] = useState(null);
  const [modules, setModules] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [roleRes, permRes] = await Promise.all([
        getRole(roleId),
        getPermissions(),
      ]);
      setRole(roleRes.data);
      setModules(permRes.data);
      setSelected(new Set(roleRes.data.permissions || []));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load role permissions."));
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    load();
  }, [load]);

  const allPermissionNames = useMemo(
    () => modules.flatMap((m) => m.permissions.map((p) => p.name)),
    [modules]
  );

  const togglePermission = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    setSuccess("");
  };

  const toggleModule = (modulePermissions, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of modulePermissions) {
        if (checked) next.add(p.name);
        else next.delete(p.name);
      }
      return next;
    });
    setSuccess("");
  };

  const isModuleFullyChecked = (modulePermissions) =>
    modulePermissions.every((p) => selected.has(p.name));

  const isModulePartiallyChecked = (modulePermissions) => {
    const count = modulePermissions.filter((p) => selected.has(p.name)).length;
    return count > 0 && count < modulePermissions.length;
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await syncRolePermissions(roleId, Array.from(selected));
      setSuccess("Permissions saved successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save permissions."));
    } finally {
      setSaving(false);
    }
  };

  const selectAll = () => setSelected(new Set(allPermissionNames));
  const clearAll = () => setSelected(new Set());

  if (loading) {
    return <section className="page-card"><p>Loading permissions…</p></section>;
  }

  return (
    <section className="page-card role-permissions-page">
      <div className="page-card-header">
        <div>
          <Link to="/roles" className="role-perm-back">← Back to roles</Link>
          <h2>{role?.label || role?.name} — Permissions</h2>
          <p>
            {role?.description || "Assign module permissions for this role."}
            {user?.company?.name ? (
              <> — <strong>{user.company.name}</strong> only.</>
            ) : null}
          </p>
        </div>
        <Can permission="role.assign_permissions">
          <div className="role-perm-toolbar">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={selectAll}>Select all</button>
            <button type="button" className="crud-btn crud-btn--ghost" onClick={clearAll}>Clear all</button>
            <button type="button" className="crud-btn crud-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save permissions"}
            </button>
          </div>
        </Can>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}
      {success && <div className="crud-alert crud-alert--success">{success}</div>}

      {!modules.length && (
        <p className="crud-empty">
          No permissions found. Run <code>php artisan db:seed --class=PermissionSeeder</code> on the backend.
        </p>
      )}

      <div className="perm-matrix">
        {modules.map((module) => (
          <div key={module.module} className="perm-module-card">
            <div className="perm-module-header">
              <label className="perm-module-title">
                <input
                  type="checkbox"
                  checked={isModuleFullyChecked(module.permissions)}
                  ref={(el) => {
                    if (el) el.indeterminate = isModulePartiallyChecked(module.permissions);
                  }}
                  onChange={(e) => toggleModule(module.permissions, e.target.checked)}
                />
                <span>{module.label}</span>
              </label>
              <span className="perm-module-count">
                {module.permissions.filter((p) => selected.has(p.name)).length}/{module.permissions.length}
              </span>
            </div>
            <ul className="perm-list">
              {module.permissions.map((perm) => (
                <li key={perm.name}>
                  <label className="perm-item">
                    <input
                      type="checkbox"
                      checked={selected.has(perm.name)}
                      onChange={() => togglePermission(perm.name)}
                    />
                    <span className="perm-item-label">{perm.label}</span>
                    <code className="perm-item-code">{perm.name}</code>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default RolePermissions;
