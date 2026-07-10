import { useCallback, useEffect, useState } from "react";
import {
  assignCompanySubscription,
  getAdminPayments,
  getAdminPlans,
  getAdminSubscriptions,
} from "../api/adminSubscription";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Subscription.css";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

function formatMoney(amount, currency = "INR") {
  return currency === "INR"
    ? `₹${Number(amount || 0).toLocaleString("en-IN")}`
    : `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function AdminSubscriptions() {
  const [rows, setRows] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assignForm, setAssignForm] = useState({ plan_id: "", start_trial: true, billing_cycle: "monthly" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [subsRes, plansRes, paymentsRes] = await Promise.all([
        getAdminSubscriptions(),
        getAdminPlans(),
        getAdminPayments(),
      ]);
      setRows(subsRes.data.subscriptions || []);
      setPlans(plansRes.data.plans || []);
      setPayments(paymentsRes.data.payments || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load subscriptions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAssign = (row) => {
    setSelected(row);
    setAssignForm({
      plan_id: String(row.subscription?.plan_id || plans[0]?.id || ""),
      start_trial: true,
      billing_cycle: "monthly",
    });
    setAssignOpen(true);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await assignCompanySubscription(selected.company_id, {
        plan_id: Number(assignForm.plan_id),
        start_trial: assignForm.start_trial,
        billing_cycle: assignForm.billing_cycle,
      });
      setAssignOpen(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to assign subscription."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-card subscription-page">
      <div className="page-card-header">
        <h2>Company Subscriptions</h2>
        <p>View every organization&apos;s plan and assign or change subscriptions (no payment required for admin).</p>
      </div>

      {error ? <p className="crud-error">{error}</p> : null}
      {loading ? <p>Loading…</p> : null}

      {!loading ? (
        <>
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Current plan</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.company_id}>
                    <td>
                      <strong>{row.company_name}</strong>
                      <div className="crud-muted">{row.company_code}</div>
                    </td>
                    <td>{row.subscription?.plan_name || "—"}</td>
                    <td className="subscription-capitalize">{row.subscription?.status || "none"}</td>
                    <td>{formatDate(row.subscription?.expires_at)}</td>
                    <td>
                      <button type="button" className="crud-btn crud-btn--sm" onClick={() => openAssign(row)}>
                        Assign plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="subscription-card subscription-card--full" style={{ marginTop: "2rem" }}>
            <h3>All subscription payments</h3>
            {payments.length === 0 ? (
              <p className="crud-muted">No payments yet.</p>
            ) : (
              <div className="crud-table-wrap">
                <table className="crud-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Company</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Reference</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.invoice_number}</td>
                        <td>{p.company_name}</td>
                        <td>{p.plan_name}</td>
                        <td>{formatMoney(p.amount, p.currency)}</td>
                        <td className="subscription-capitalize">{p.payment_status}</td>
                        <td>{p.transaction_reference || "—"}</td>
                        <td>{formatDate(p.payment_date || p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      <Modal title={`Assign plan — ${selected?.company_name || ""}`} open={assignOpen} onClose={() => setAssignOpen(false)}>
        <form className="crud-form" onSubmit={handleAssign}>
          <label className="crud-field">
            <span>Plan</span>
            <select
              value={assignForm.plan_id}
              onChange={(e) => setAssignForm({ ...assignForm, plan_id: e.target.value })}
              required
            >
              <option value="">Select plan</option>
              {plans.filter((p) => p.status === "active").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="crud-field">
            <span>Billing cycle</span>
            <select
              value={assignForm.billing_cycle}
              onChange={(e) => setAssignForm({ ...assignForm, billing_cycle: e.target.value })}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <label className="crud-field subscription-admin-feature">
            <input
              type="checkbox"
              checked={assignForm.start_trial}
              onChange={(e) => setAssignForm({ ...assignForm, start_trial: e.target.checked })}
            />
            Start with trial period
          </label>
          <div className="crud-form-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setAssignOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Assigning…" : "Assign plan"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default AdminSubscriptions;
