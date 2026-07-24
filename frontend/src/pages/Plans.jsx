import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPlan,
  deletePlan,
  getAdminPlans,
  getPlanFeatures,
  getSubscriptionTax,
  updatePlan,
  updateSubscriptionTax,
} from "../api/adminSubscription";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import "./Subscription.css";
import { getApiErrorMessage } from "../utils/apiError";
import { applyTax } from "../utils/tax";

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
  tax_enabled: true,
  tax_mode: "igst",
  tax_rate: 18,
  tax_inclusive: false,
  features: [],
  limits: { ...EMPTY_LIMITS },
};

const emptyPlatformTax = {
  enabled: true,
  mode: "igst",
  rate: 18,
  inclusive: false,
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
  const [platformTax, setPlatformTax] = useState(emptyPlatformTax);
  const [taxSaving, setTaxSaving] = useState(false);
  const [taxNotice, setTaxNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [plansRes, featuresRes, taxRes] = await Promise.all([
        getAdminPlans(),
        getPlanFeatures(),
        getSubscriptionTax(),
      ]);
      setPlans(plansRes.data.plans || []);
      setCatalog(featuresRes.data);
      setPlatformTax({
        enabled: Boolean(taxRes.data.enabled),
        mode: taxRes.data.mode || "igst",
        rate: Number(taxRes.data.rate) || 0,
        inclusive: Boolean(taxRes.data.inclusive),
      });
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
    setForm({
      ...emptyForm,
      limits: { ...EMPTY_LIMITS },
      tax_enabled: platformTax.enabled,
      tax_mode: platformTax.mode,
      tax_rate: platformTax.rate,
      tax_inclusive: platformTax.inclusive,
    });
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
      tax_enabled: Boolean(row.tax_enabled),
      tax_mode: row.tax_mode || "igst",
      tax_rate: Number(row.tax_rate) || 0,
      tax_inclusive: Boolean(row.tax_inclusive),
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
      tax_enabled: Boolean(form.tax_enabled),
      tax_mode: form.tax_mode,
      tax_rate: Number(form.tax_rate),
      tax_inclusive: Boolean(form.tax_inclusive),
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

  const handleSavePlatformTax = async () => {
    setTaxSaving(true);
    setTaxNotice("");
    try {
      const { data } = await updateSubscriptionTax(platformTax);
      setPlatformTax({
        enabled: Boolean(data.tax?.enabled ?? platformTax.enabled),
        mode: data.tax?.mode || platformTax.mode,
        rate: Number(data.tax?.rate ?? platformTax.rate),
        inclusive: Boolean(data.tax?.inclusive ?? platformTax.inclusive),
      });
      setTaxNotice("Platform subscription tax saved. New plans will use these defaults.");
    } catch (err) {
      setTaxNotice(getApiErrorMessage(err, "Failed to save subscription tax."));
    } finally {
      setTaxSaving(false);
    }
  };

  const planTaxPreview = useMemo(() => {
    const subtotal =
      Number(form.monthly_price || 0) * (1 - Number(form.discount_percent || 0) / 100);
    return applyTax(subtotal, {
      enabled: form.tax_enabled,
      mode: form.tax_mode,
      rate: form.tax_rate,
      inclusive: form.tax_inclusive,
    });
  }, [form.monthly_price, form.discount_percent, form.tax_enabled, form.tax_mode, form.tax_rate, form.tax_inclusive]);

  return (
    <section className="page-card plans-page">
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

      <div className="subscription-tax-card">
        <h3>Platform subscription tax</h3>
        <p className="crud-muted">
          Default GST applied when hospitals pay for plans. Each plan can override these settings below.
        </p>
        <div className="crud-form-grid">
          <label className="crud-field">
            <span>Enable tax</span>
            <select
              value={platformTax.enabled ? "1" : "0"}
              onChange={(e) => setPlatformTax((p) => ({ ...p, enabled: e.target.value === "1" }))}
            >
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </label>
          <label className="crud-field">
            <span>Tax split</span>
            <select
              value={platformTax.mode}
              onChange={(e) => setPlatformTax((p) => ({ ...p, mode: e.target.value }))}
            >
              <option value="cgst_sgst">CGST + SGST</option>
              <option value="igst">IGST</option>
            </select>
          </label>
          <label className="crud-field">
            <span>Total GST rate (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={platformTax.rate}
              onChange={(e) => setPlatformTax((p) => ({ ...p, rate: e.target.value }))}
              placeholder="18"
            />
          </label>
          <label className="crud-field">
            <span>Prices include tax</span>
            <select
              value={platformTax.inclusive ? "1" : "0"}
              onChange={(e) => setPlatformTax((p) => ({ ...p, inclusive: e.target.value === "1" }))}
            >
              <option value="0">No — tax added on top</option>
              <option value="1">Yes — tax-inclusive</option>
            </select>
          </label>
        </div>
        {taxNotice ? <p className="crud-muted">{taxNotice}</p> : null}
        <button
          type="button"
          className="crud-btn crud-btn--secondary"
          onClick={handleSavePlatformTax}
          disabled={taxSaving}
        >
          {taxSaving ? "Saving…" : "Save platform tax defaults"}
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
                <th>Tax</th>
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
                  <td>
                    {row.tax_enabled
                      ? `${row.tax_rate}% ${row.tax_mode === "igst" ? "IGST" : "CGST+SGST"}`
                      : "No tax"}
                  </td>
                  <td>{row.trial_days} days</td>
                  <td className="subscription-capitalize">{row.status}</td>
                  <td>{row.subscriptions_count}</td>
                  <td>
                    <div className="crud-actions">
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
                    </div>
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
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Plan name" />
            </label>
            <label className="crud-field">
              <span>Code</span>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="auto-generated if empty" />
            </label>
            <label className="crud-field crud-field--full">
              <span>Description</span>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Enter description…" />
            </label>
            <label className="crud-field">
              <span>Monthly price</span>
              <input type="number" min="0" step="0.01" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} required placeholder="0.00" />
            </label>
            <label className="crud-field">
              <span>Yearly price</span>
              <input type="number" min="0" step="0.01" value={form.yearly_price} onChange={(e) => setForm({ ...form, yearly_price: e.target.value })} required placeholder="0.00" />
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
                placeholder="0"
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
              <input type="number" min="0" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: e.target.value })} required placeholder="14" />
            </label>
            <label className="crud-field">
              <span>Display order</span>
              <input type="number" min="0" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} required placeholder="0" />
            </label>
            <label className="crud-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <p className="crud-field crud-field--full company-modules-label">Plan tax (subscription checkout)</p>
            <label className="crud-field">
              <span>Enable tax on this plan</span>
              <select
                value={form.tax_enabled ? "1" : "0"}
                onChange={(e) => setForm({ ...form, tax_enabled: e.target.value === "1" })}
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </label>
            <label className="crud-field">
              <span>Tax split</span>
              <select value={form.tax_mode} onChange={(e) => setForm({ ...form, tax_mode: e.target.value })}>
                <option value="cgst_sgst">CGST + SGST</option>
                <option value="igst">IGST</option>
              </select>
            </label>
            <label className="crud-field">
              <span>Total GST rate (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.tax_rate}
                onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
                placeholder="18"
              />
            </label>
            <label className="crud-field">
              <span>Plan prices include tax</span>
              <select
                value={form.tax_inclusive ? "1" : "0"}
                onChange={(e) => setForm({ ...form, tax_inclusive: e.target.value === "1" })}
              >
                <option value="0">No — tax added on top</option>
                <option value="1">Yes — tax-inclusive</option>
              </select>
            </label>
            {form.tax_enabled && (
              <div className="crud-field crud-field--full subscription-tax-preview">
                <span className="crud-muted">Monthly checkout preview (after discount)</span>
                <div>Subtotal: {formatMoney(planTaxPreview.taxable_amount, form.currency)}</div>
                {planTaxPreview.cgst_amount > 0 && (
                  <div>CGST @ {planTaxPreview.cgst_rate}%: {formatMoney(planTaxPreview.cgst_amount, form.currency)}</div>
                )}
                {planTaxPreview.sgst_amount > 0 && (
                  <div>SGST @ {planTaxPreview.sgst_rate}%: {formatMoney(planTaxPreview.sgst_amount, form.currency)}</div>
                )}
                {planTaxPreview.igst_amount > 0 && (
                  <div>IGST @ {planTaxPreview.igst_rate}%: {formatMoney(planTaxPreview.igst_amount, form.currency)}</div>
                )}
                <strong>Total payable: {formatMoney(planTaxPreview.grand_total, form.currency)}</strong>
              </div>
            )}
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
