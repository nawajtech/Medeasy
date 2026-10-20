import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assignCompanySubscription,
  downloadAdminInvoicePdf,
  getAdminPayments,
  getAdminPlans,
  getAdminSubscriptions,
  rejectSubscriptionPayment,
  verifySubscriptionPayment,
} from "../api/adminSubscription";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Subscription.css";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatMoney(amount, currency = "INR") {
  return currency === "INR"
    ? `₹${Number(amount || 0).toLocaleString("en-IN")}`
    : `${currency} ${Number(amount || 0).toLocaleString()}`;
}

function statusLabel(status) {
  if (status === "awaiting_verification") return "Awaiting verification";
  return String(status || "—").replace(/_/g, " ");
}

function AdminSubscriptions() {
  const [rows, setRows] = useState([]);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingVerification, setPendingVerification] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assignForm, setAssignForm] = useState({ plan_id: "", start_trial: true, billing_cycle: "monthly" });
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

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
      setPendingVerification(paymentsRes.data.pending_verification || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load subscriptions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => pendingVerification.length || payments.filter((p) => p.needs_verification).length,
    [pendingVerification, payments]
  );

  const handleDownload = async (payment) => {
    setDownloadingId(payment.id);
    setError("");
    try {
      await downloadAdminInvoicePdf(payment.id, payment.invoice_number);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to download invoice."));
    } finally {
      setDownloadingId(null);
    }
  };

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
      setNotice("Plan assigned successfully.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to assign subscription."));
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (payment) => {
    if (
      !window.confirm(
        `Verify purchase for ${payment.company_name}?\n\nInvoice: ${payment.invoice_number}\nAmount: ${formatMoney(
          payment.amount,
          payment.currency
        )}\nReference: ${payment.transaction_reference || "—"}\n\nThis will activate their ${payment.plan_name} plan.`
      )
    ) {
      return;
    }

    setActionId(payment.id);
    setError("");
    setNotice("");
    try {
      const { data } = await verifySubscriptionPayment(payment.id);
      setNotice(data.message || "Purchase verified.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to verify purchase."));
    } finally {
      setActionId(null);
    }
  };

  const openReject = (payment) => {
    setRejectTarget(payment);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setActionId(rejectTarget.id);
    setError("");
    setNotice("");
    try {
      const { data } = await rejectSubscriptionPayment(rejectTarget.id, {
        reason: rejectReason.trim(),
      });
      setRejectOpen(false);
      setRejectTarget(null);
      setNotice(data.message || "Purchase rejected.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reject purchase."));
    } finally {
      setActionId(null);
    }
  };

  return (
    <section className="page-card subscription-page">
      <div className="page-card-header">
        <h2>Company Subscriptions</h2>
        <p>
          Verify customer purchases, assign plans, and review payment history. Plans activate only after Super Admin
          verification.
        </p>
      </div>

      {error ? <p className="crud-error">{error}</p> : null}
      {notice ? <p className="subscription-notice">{notice}</p> : null}
      {loading ? <p>Loading…</p> : null}

      {!loading ? (
        <>
          <section className="subscription-card subscription-card--full subscription-verify-section">
            <div className="subscription-verify-head">
              <div>
                <h3>Verify purchases</h3>
                <p className="crud-muted">
                  Customers submit payment proof after checkout. Review the reference, then approve to activate the
                  plan or reject if it looks invalid.
                </p>
              </div>
              <span
                className={`subscription-plan-badge ${
                  pendingCount > 0 ? "subscription-plan-badge--soon" : "subscription-plan-badge--current"
                }`}
              >
                {pendingCount} pending
              </span>
            </div>

            {pendingCount === 0 ? (
              <p className="crud-muted">No purchases waiting for verification.</p>
            ) : (
              <div className="crud-table-wrap">
                <table className="crud-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Company</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pendingVerification.length ? pendingVerification : payments.filter((p) => p.needs_verification)).map(
                      (p) => (
                        <tr key={p.id}>
                          <td>{p.invoice_number}</td>
                          <td>
                            <strong>{p.company_name}</strong>
                            <div className="crud-muted">{p.company_code}</div>
                          </td>
                          <td>
                            {p.plan_name || "—"}
                            {p.billing_cycle ? (
                              <div className="crud-muted subscription-capitalize">{p.billing_cycle}</div>
                            ) : null}
                          </td>
                          <td>{formatMoney(p.amount, p.currency)}</td>
                          <td className="subscription-capitalize">
                            {(p.payment_method || "—").replace(/_/g, " ")}
                          </td>
                          <td>
                            <code>{p.transaction_reference || "—"}</code>
                          </td>
                          <td>{formatDate(p.submitted_at || p.payment_date || p.created_at)}</td>
                          <td>
                            <div className="crud-actions">
                              <button
                                type="button"
                                className="crud-btn crud-btn--sm crud-btn--primary"
                                disabled={actionId === p.id}
                                onClick={() => handleVerify(p)}
                              >
                                {actionId === p.id ? "…" : "Verify & activate"}
                              </button>
                              <button
                                type="button"
                                className="crud-btn crud-btn--sm crud-btn--danger"
                                disabled={actionId === p.id}
                                onClick={() => openReject(p)}
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                className="crud-btn crud-btn--sm"
                                onClick={() => handleDownload(p)}
                                disabled={downloadingId === p.id}
                              >
                                {downloadingId === p.id ? "…" : "PDF"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="crud-table-wrap" style={{ marginTop: "2rem" }}>
            <h3>Organizations</h3>
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.invoice_number}</td>
                        <td>{p.company_name}</td>
                        <td>{p.plan_name}</td>
                        <td>{formatMoney(p.amount, p.currency)}</td>
                        <td className="subscription-capitalize">{statusLabel(p.payment_status)}</td>
                        <td>{p.transaction_reference || "—"}</td>
                        <td>{formatDate(p.payment_date || p.created_at)}</td>
                        <td>
                          <div className="crud-actions">
                            {p.needs_verification ? (
                              <>
                                <button
                                  type="button"
                                  className="crud-btn crud-btn--sm crud-btn--primary"
                                  disabled={actionId === p.id}
                                  onClick={() => handleVerify(p)}
                                >
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  className="crud-btn crud-btn--sm crud-btn--danger"
                                  disabled={actionId === p.id}
                                  onClick={() => openReject(p)}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              className="crud-btn crud-btn--sm"
                              onClick={() => handleDownload(p)}
                              disabled={downloadingId === p.id}
                            >
                              {downloadingId === p.id ? "Downloading…" : "Download PDF"}
                            </button>
                          </div>
                        </td>
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
              {plans
                .filter((p) => p.status === "active" && p.is_purchasable !== false)
                .map((p) => (
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

      <Modal
        title={`Reject purchase — ${rejectTarget?.invoice_number || ""}`}
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectTarget(null);
        }}
      >
        <form className="crud-form" onSubmit={handleReject}>
          <p className="crud-muted">
            {rejectTarget?.company_name} · {rejectTarget?.plan_name} ·{" "}
            {formatMoney(rejectTarget?.amount, rejectTarget?.currency)}
          </p>
          <label className="crud-field">
            <span>Reason (shown for internal record)</span>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              placeholder="e.g. Transaction reference not found / amount mismatch"
            />
          </label>
          <div className="crud-form-actions">
            <button
              type="button"
              className="crud-btn crud-btn--ghost"
              onClick={() => {
                setRejectOpen(false);
                setRejectTarget(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="crud-btn crud-btn--danger"
              disabled={actionId === rejectTarget?.id || !rejectReason.trim()}
            >
              {actionId === rejectTarget?.id ? "Rejecting…" : "Reject purchase"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default AdminSubscriptions;
