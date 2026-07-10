import { useCallback, useEffect, useState } from "react";
import {
  createPlan,
  deletePlan,
  getAdminPlans,
  getPlanFeatures,
  updatePlan,
} from "../api/adminSubscription";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";

const EMPTY_LIMITS = {
  max_users: "",
  max_branches: "",
  max_storage_mb: "",
  max_patients: "",
  max_monthly_reports: "",
  max_api_requests: "",
};

const emptyForm = {
  name: "",
  code: "",
  description: "",
  monthly_price: "",
  yearly_price: "",
  discount_percent: 0,
  currency: "INR",
  trial_days: 14,
  status: "active",
  display_order: 0,
  features: [],
  limits: { ...EMPTY_LIMITS },
};

function formatMoney(amount, currency = "INR") {
  const value = Number(amount || 0);
  return currency === "INR" ? `₹${value.toLocaleString("en-IN")}` : `${currency} ${value}`;
}

function Plans() {
  const [plans, setPlans] = useState([]);
  const [catalog, setCatalog] = useState({ features: [], limit_keys: [] });
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
      const [plansRes, featuresRes] = await Promise.all([getAdminPlans(), getPlanFeatures()]);
      setPlans(plansRes.data.plans || []);
      setCatalog(featuresRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load plans."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, limits: { ...EMPTY_LIMITS } });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name,
      code: row.code,
      description: row.description || "",
      monthly_price: row.monthly_price,
      yearly_price: row.yearly_price,
      discount_percent: row.discount_percent ?? 0,
      currency: row.currency || "INR",
      trial_days: row.trial_days,
      status: row.status,
      display_order: row.display_order,
      features: row.features || [],
      limits: {
        ...EMPTY_LIMITS,
        ...Object.fromEntries(
          Object.entries(row.limits || {}).map(([k, v]) => [k, v == null ? "" : String(v)])
        ),
      },
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const toggleFeature = (featureId) => {
    setForm((prev) => {
      const set = new Set(prev.features);
      if (set.has(featureId)) set.delete(featureId);
      else set.add(featureId);
      return { ...prev, features: [...set] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      monthly_price: Number(form.monthly_price),
      yearly_price: Number(form.yearly_price),
      discount_percent: Number(form.discount_percent),
      trial_days: Number(form.trial_days),
      display_order: Number(form.display_order),
      limits: Object.fromEntries(
        Object.entries(form.limits).map(([k, v]) => [k, v === "" ? null : Number(v)])
      ),
    };
    try {
      if (editing) await updatePlan(editing.id, payload);
      else await createPlan(payload);
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save plan."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete plan "${row.name}"?`)) return;
    try {
      await deletePlan(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete plan."));
    }
  };

  return (
    <section className="page-card">
      <div className="page-card-header">
        <h2>Subscription Plans</h2>
        <p>
          Features marked <span className="subscription-feature-badge subscription-feature-badge--live">Live</span> control
          real app modules today. <span className="subscription-feature-badge">Coming soon</span> are saved for future
          releases. Limits block creation when the cap is reached.
        </p>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          + New plan
        </button>
      </div>

      {error ? <p className="crud-error">{error}</p> : null}
      {loading ? <p>Loading plans…</p> : null}

      {!loading ? (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Plan</th>
                <th>Monthly</th>
                <th>Discount</th>
                <th>Yearly</th>
                <th>Trial</th>
                <th>Status</th>
                <th>Subscribers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((row) => (
                <tr key={row.id}>
                  <td>{row.display_order}</td>
                  <td>
                    <strong>{row.name}</strong>
                    <div className="crud-muted">{row.code}</div>
                  </td>
                  <td>{formatMoney(row.monthly_price, row.currency)}</td>
                  <td>{row.discount_percent ? `${row.discount_percent}%` : "—"}</td>
                  <td>{formatMoney(row.yearly_price, row.currency)}</td>
                  <td>{row.trial_days} days</td>
                  <td className="subscription-capitalize">{row.status}</td>
                  <td>{row.subscriptions_count}</td>
                  <td className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--sm" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="crud-btn crud-btn--sm crud-btn--danger"
                      onClick={() => handleDelete(row)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal title={editing ? "Edit plan" : "New plan"} open={modalOpen} onClose={closeModal} wide>
        <form className="crud-form" onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            <label className="crud-field">
              <span>Plan name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="crud-field">
              <span>Code</span>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="auto-generated if empty" />
            </label>
            <label className="crud-field crud-field--full">
              <span>Description</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </label>
            <label className="crud-field">
              <span>Monthly price</span>
              <input type="number" min="0" step="0.01" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} required />
            </label>
            <label className="crud-field">
              <span>Yearly price</span>
              <input type="number" min="0" step="0.01" value={form.yearly_price} onChange={(e) => setForm({ ...form, yearly_price: e.target.value })} required />
            </label>
            <label className="crud-field">
              <span>Discount (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                value={form.discount_percent}
                onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                required
              />
            </label>
            {Number(form.discount_percent) > 0 ? (
              <p className="crud-muted crud-field--full">
                Final monthly: {formatMoney(Number(form.monthly_price) * (1 - Number(form.discount_percent) / 100), form.currency)}
                {" · "}
                Final yearly: {formatMoney(Number(form.yearly_price) * (1 - Number(form.discount_percent) / 100), form.currency)}
              </p>
            ) : null}
            <label className="crud-field">
              <span>Currency</span>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="crud-field">
              <span>Trial days</span>
              <input type="number" min="0" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: e.target.value })} required />
            </label>
            <label className="crud-field">
              <span>Display order</span>
              <input type="number" min="0" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} required />
            </label>
            <label className="crud-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="crud-field crud-field--full">
            <span className="company-modules-label">Features (what this plan unlocks)</span>
            <div className="subscription-admin-features">
              {catalog.features.map((feature) => (
                <label key={feature.id} className="subscription-admin-feature">
                  <input
                    type="checkbox"
                    checked={form.features.includes(feature.id)}
                    onChange={() => toggleFeature(feature.id)}
                  />
                  <span>{feature.name}</span>
                  <span
                    className={`subscription-feature-badge${
                      feature.is_live ? " subscription-feature-badge--live" : ""
                    }`}
                  >
                    {feature.is_live ? "Live" : "Coming soon"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="crud-form-grid">
            {catalog.limit_keys?.map((key) => (
              <label className="crud-field" key={key}>
                <span>{catalog.limit_labels?.[key] || key.replace(/_/g, " ")}</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  value={form.limits[key] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, limits: { ...form.limits, [key]: e.target.value } })
                  }
                />
              </label>
            ))}
          </div>

          <div className="crud-form-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update plan" : "Create plan"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default Plans;
