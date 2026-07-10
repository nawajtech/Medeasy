import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { checkout, confirmPayment, getPayments, getPlans } from "../api/subscription";
import { useAuth } from "../auth/AuthContext";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Subscription.css";

const FEATURE_LABELS = {
  patient_management: "Patient Management",
  appointment_management: "Appointment Management",
  billing: "Billing",
  lab_module: "Lab Module",
  pharmacy: "Medicine Master",
  inventory: "Inventory",
  multi_branch: "Multi Branch",
  api_access: "API Access",
  analytics: "Analytics",
  ai_ocr: "AI OCR",
  ai_report_explanation: "AI Report Explanation",
  voice_assistant: "Voice Assistant",
  ai_chat_assistant: "AI Chat Assistant",
};

const LIMIT_LABELS = {
  max_users: "Maximum Users",
  max_branches: "Maximum Branches",
  max_storage_mb: "Maximum Storage (MB)",
  max_patients: "Maximum Patients",
  max_monthly_reports: "Maximum Monthly Reports",
  max_api_requests: "Maximum API Requests",
};

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount, currency = "INR") {
  const value = Number(amount || 0);
  if (currency === "INR") {
    return `₹${value.toLocaleString("en-IN")}`;
  }
  return `${currency} ${value.toLocaleString()}`;
}

function statusClass(status) {
  return `subscription-status subscription-status--${status || "unknown"}`;
}

function PlanCard({ plan, isCurrent, busy, onSelect }) {
  const currency = plan.currency || "INR";
  const monthly = plan.monthly_price_final ?? plan.monthly_price;
  const yearly = plan.yearly_price_final ?? plan.yearly_price;
  const monthlyTotal = plan.monthly_total ?? monthly;
  const yearlyTotal = plan.yearly_total ?? yearly;
  const hasDiscount = Number(plan.discount_percent) > 0;
  const hasTax = Boolean(plan.tax_enabled) && monthlyTotal !== monthly;

  return (
    <div className={`subscription-plan-card${isCurrent ? " is-current" : ""}`}>
      <div className="subscription-plan-card-head">
        <h4>{plan.name}</h4>
        {(isCurrent || hasDiscount || plan.tax_enabled) && (
          <div className="subscription-plan-card-badges">
            {isCurrent ? (
              <span className="subscription-plan-badge subscription-plan-badge--current">Current plan</span>
            ) : null}
            {hasDiscount ? (
              <span className="subscription-plan-badge subscription-plan-badge--discount">
                {plan.discount_percent}% off
              </span>
            ) : null}
            {plan.tax_enabled ? (
              <span className="subscription-plan-badge subscription-plan-badge--tax">
                {plan.tax_rate}% {plan.tax_mode === "igst" ? "IGST" : "CGST+SGST"}
              </span>
            ) : null}
          </div>
        )}
      </div>
      <p className="subscription-plan-card-price">
        {formatMoney(hasTax ? monthlyTotal : monthly, currency)}
        <span> / month{hasTax ? " incl. tax" : ""}</span>
      </p>
      {hasDiscount ? (
        <p className="subscription-plan-card-yearly">
          <s>{formatMoney(plan.monthly_price, currency)}</s>
        </p>
      ) : null}
      <p className="subscription-plan-card-yearly">
        {formatMoney(hasTax ? yearlyTotal : yearly, currency)} / year
      </p>
      <p className="subscription-plan-card-desc">{plan.description}</p>
      <ul className="subscription-plan-card-features">
        {(plan.features || []).slice(0, 6).map((key) => (
          <li key={key}>{FEATURE_LABELS[key] || key.replace(/_/g, " ")}</li>
        ))}
        {(plan.features || []).length > 6 ? (
          <li className="subscription-plan-card-more">
            +{plan.features.length - 6} more features
          </li>
        ) : null}
      </ul>
      <button
        type="button"
        className="crud-btn crud-btn--primary subscription-plan-card-btn"
        disabled={isCurrent || busy}
        onClick={() => onSelect(plan)}
      >
        {isCurrent ? "Active" : busy ? "Processing…" : `Upgrade to ${plan.name}`}
      </button>
    </div>
  );
}

function PaymentModal({
  open,
  plan,
  paymentMethods,
  checkoutData,
  billingCycle,
  onBillingCycleChange,
  paymentMethod,
  onPaymentMethodChange,
  transactionReference,
  onTransactionReferenceChange,
  busy,
  error,
  onClose,
  onCreateInvoice,
  onConfirmPayment,
}) {
  const currency = plan?.currency || checkoutData?.currency || "INR";
  const baseAmount =
    checkoutData?.base_amount ??
    (billingCycle === "yearly" ? plan?.yearly_price : plan?.monthly_price);
  const subtotal = checkoutData?.subtotal ?? checkoutData?.amount ?? plan?.[`${billingCycle}_price_final`] ?? baseAmount;
  const amount = checkoutData?.amount ?? subtotal;
  const discountPercent = checkoutData?.discount_percent ?? plan?.discount_percent ?? 0;
  const taxEnabled = Boolean(checkoutData?.tax_enabled);

  return (
    <Modal title={`Pay for ${plan?.name}`} open={open} onClose={onClose} wide>
      <div className="subscription-payment-modal">
        <p className="crud-muted">
          Complete payment before your plan is changed. The new plan activates only after payment is confirmed.
        </p>

        <div className="subscription-payment-summary">
          <div>
            <span className="subscription-eyebrow">Selected plan</span>
            <strong>{plan?.name}</strong>
          </div>
          <div className="subscription-payment-amount">
            <span className="subscription-eyebrow">Amount due</span>
            <strong>{formatMoney(amount, currency)}</strong>
            {Number(discountPercent) > 0 ? (
              <span className="crud-muted">
                {discountPercent}% off · was {formatMoney(baseAmount, currency)}
              </span>
            ) : null}
            {checkoutData && taxEnabled ? (
              <div className="subscription-tax-breakdown">
                <span>Subtotal: {formatMoney(subtotal, currency)}</span>
                {Number(checkoutData.cgst_amount) > 0 && (
                  <span>CGST @ {checkoutData.cgst_rate}%: {formatMoney(checkoutData.cgst_amount, currency)}</span>
                )}
                {Number(checkoutData.sgst_amount) > 0 && (
                  <span>SGST @ {checkoutData.sgst_rate}%: {formatMoney(checkoutData.sgst_amount, currency)}</span>
                )}
                {Number(checkoutData.igst_amount) > 0 && (
                  <span>IGST @ {checkoutData.igst_rate}%: {formatMoney(checkoutData.igst_amount, currency)}</span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {!checkoutData ? (
          <>
            <label className="crud-field">
              <span>Billing cycle</span>
              <select
                value={billingCycle}
                onChange={(e) => onBillingCycleChange(e.target.value)}
              >
                <option value="monthly">
                  Monthly — {formatMoney(plan?.monthly_price_final ?? plan?.monthly_price, currency)}
                  {Number(plan?.discount_percent) > 0 ? ` (${plan.discount_percent}% off)` : ""}
                </option>
                <option value="yearly">
                  Yearly — {formatMoney(plan?.yearly_price_final ?? plan?.yearly_price, currency)}
                  {Number(plan?.discount_percent) > 0 ? ` (${plan.discount_percent}% off)` : ""}
                </option>
              </select>
            </label>

            {error ? <p className="subscription-notice subscription-notice--error">{error}</p> : null}

            <div className="subscription-payment-actions">
              <button type="button" className="crud-btn crud-btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="crud-btn crud-btn--primary"
                disabled={busy}
                onClick={onCreateInvoice}
              >
                {busy ? "Creating invoice…" : "Generate invoice"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="subscription-invoice-box">
              <p>
                <span>Invoice</span>
                <strong>{checkoutData.invoice_number}</strong>
              </p>
              <p>
                <span>Status</span>
                <strong className="subscription-capitalize">{checkoutData.payment_status}</strong>
              </p>
            </div>

            <label className="crud-field">
              <span>Payment method</span>
              <select
                value={paymentMethod}
                onChange={(e) => onPaymentMethodChange(e.target.value)}
              >
                <option value="">Select method</option>
                {Object.entries(paymentMethods).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="crud-field">
              <span>Transaction reference / UTR / Receipt no.</span>
              <input
                type="text"
                value={transactionReference}
                onChange={(e) => onTransactionReferenceChange(e.target.value)}
                placeholder="e.g. UTR1234567890"
              />
            </label>

            {error ? <p className="subscription-notice subscription-notice--error">{error}</p> : null}

            <div className="subscription-payment-actions">
              <button type="button" className="crud-btn crud-btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="crud-btn crud-btn--primary"
                disabled={busy || !paymentMethod || !transactionReference.trim()}
                onClick={onConfirmPayment}
              >
                {busy ? "Confirming…" : "Confirm payment & activate plan"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function Subscription() {
  const { user, isCompanyAdmin, refreshMe } = useAuth();
  const subscription = user?.subscription;

  const [plans, setPlans] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState({});
  const [payments, setPayments] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [checkoutData, setCheckoutData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modalError, setModalError] = useState("");

  const loadPayments = useCallback(() => {
    getPayments()
      .then(({ data }) => setPayments(data.payments || []))
      .catch(() => setPayments([]));
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    if (!isCompanyAdmin) return;
    getPlans()
      .then(({ data }) => {
        setPlans(data.plans || []);
        setPaymentMethods(data.payment_methods || {});
      })
      .catch(() => setPlans([]));
    loadPayments();
  }, [isCompanyAdmin, loadPayments]);

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedPlan(null);
    setCheckoutData(null);
    setBillingCycle("monthly");
    setPaymentMethod("");
    setTransactionReference("");
    setModalError("");
    setBusy(false);
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setCheckoutData(null);
    setBillingCycle("monthly");
    setPaymentMethod("");
    setTransactionReference("");
    setModalError("");
    setPaymentModalOpen(true);
  };

  const handleCreateInvoice = async () => {
    if (!selectedPlan) return;
    setBusy(true);
    setModalError("");
    try {
      const { data } = await checkout({
        plan_id: selectedPlan.id,
        billing_cycle: billingCycle,
      });
      setCheckoutData(data.payment);
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!checkoutData?.id) return;
    setBusy(true);
    setModalError("");
    try {
      const { data } = await confirmPayment(checkoutData.id, {
        payment_method: paymentMethod,
        transaction_reference: transactionReference.trim(),
      });
      setNotice({ type: "success", text: data.message });
      closePaymentModal();
      await refreshMe();
      loadPayments();
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!isCompanyAdmin) {
    return (
      <div className="crud-page">
        <p className="crud-muted">Subscription details are available to company administrators only.</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="crud-page">
        <div className="subscription-empty">
          <h2>No active subscription</h2>
          <p>Your organization does not have a subscription assigned yet. Please contact the MedEasy platform administrator.</p>
        </div>
      </div>
    );
  }

  const { plan, features = [], limits = {} } = subscription;
  const currency = plan?.currency || "INR";

  return (
    <div className="crud-page subscription-page">
      <PaymentModal
        open={paymentModalOpen}
        plan={selectedPlan}
        paymentMethods={paymentMethods}
        checkoutData={checkoutData}
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        transactionReference={transactionReference}
        onTransactionReferenceChange={setTransactionReference}
        busy={busy}
        error={modalError}
        onClose={closePaymentModal}
        onCreateInvoice={handleCreateInvoice}
        onConfirmPayment={handleConfirmPayment}
      />

      <div className="subscription-hero">
        <div>
          <p className="subscription-eyebrow">Current plan</p>
          <h2 className="subscription-plan-name">{plan?.name}</h2>
          <p className="subscription-plan-desc">{plan?.description || "Your organization subscription plan."}</p>
        </div>
        <div className="subscription-hero-meta">
          <span className={statusClass(subscription.status)}>
            {subscription.status?.replace(/_/g, " ")}
          </span>
          {!subscription.is_usable ? (
            <span className="subscription-warning">Access limited — renew or upgrade required</span>
          ) : null}
        </div>
      </div>

      <div className="subscription-grid">
        <section className="subscription-card">
          <h3>Billing</h3>
          <dl className="subscription-dl">
            <div>
              <dt>Monthly</dt>
              <dd>{formatMoney(plan?.monthly_price, currency)}</dd>
            </div>
            <div>
              <dt>Yearly</dt>
              <dd>{formatMoney(plan?.yearly_price, currency)}</dd>
            </div>
            <div>
              <dt>Billing cycle</dt>
              <dd className="subscription-capitalize">{subscription.billing_cycle || "monthly"}</dd>
            </div>
            <div>
              <dt>Auto renewal</dt>
              <dd>{subscription.auto_renewal ? "Enabled" : "Disabled"}</dd>
            </div>
          </dl>
        </section>

        <section className="subscription-card">
          <h3>Period</h3>
          <dl className="subscription-dl">
            <div>
              <dt>Started</dt>
              <dd>{formatDate(subscription.starts_at)}</dd>
            </div>
            <div>
              <dt>Trial ends</dt>
              <dd>{formatDate(subscription.trial_ends_at)}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{formatDate(subscription.expires_at)}</dd>
            </div>
            <div>
              <dt>Renewal date</dt>
              <dd>{formatDate(subscription.renewal_date)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="subscription-card subscription-card--full">
        <h3>Included features</h3>
        {features.length === 0 ? (
          <p className="crud-muted">No features enabled on this plan.</p>
        ) : (
          <ul className="subscription-feature-list">
            {features.map((key) => (
              <li key={key}>{FEATURE_LABELS[key] || key.replace(/_/g, " ")}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="subscription-card subscription-card--full">
        <h3>Plan limits</h3>
        <div className="subscription-limits-grid">
          {Object.entries(limits).map(([key, value]) => (
            <div className="subscription-limit-item" key={key}>
              <span className="subscription-limit-label">{LIMIT_LABELS[key] || key}</span>
              <strong>{value == null ? "Unlimited" : value.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="subscription-card subscription-card--full" id="upgrade">
        <h3>Upgrade your plan</h3>
        <p className="crud-muted subscription-upgrade-hint">
          Select a plan, generate an invoice, complete payment, then your new plan will be activated.
        </p>

        {notice ? (
          <p className={`subscription-notice subscription-notice--${notice.type}`}>{notice.text}</p>
        ) : null}

        {plans.length === 0 ? (
          <p className="crud-muted">No plans available right now.</p>
        ) : (
          <div className="subscription-plans-grid">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                isCurrent={p.id === plan?.id}
                busy={busy && selectedPlan?.id === p.id}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        )}
      </section>

      <section className="subscription-card subscription-card--full">
        <h3>Payment history</h3>
        {payments.length === 0 ? (
          <p className="crud-muted">No payments recorded yet.</p>
        ) : (
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => (
                  <tr key={row.id}>
                    <td>{row.invoice_number}</td>
                    <td>{row.plan_name || "—"}</td>
                    <td>{formatMoney(row.amount, row.currency)}</td>
                    <td className="subscription-capitalize">{row.payment_method?.replace(/_/g, " ") || "—"}</td>
                    <td>{row.transaction_reference || "—"}</td>
                    <td className="subscription-capitalize">{row.payment_status}</td>
                    <td>{formatDate(row.payment_date || row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function SubscriptionSummaryCard() {
  const { user, isCompanyAdmin } = useAuth();
  const subscription = user?.subscription;

  if (!isCompanyAdmin || !subscription?.plan) return null;

  return (
    <div className="subscription-summary-card">
      <div>
        <p className="subscription-eyebrow">Your plan</p>
        <strong>{subscription.plan.name}</strong>
        <span className={statusClass(subscription.status)}>{subscription.status}</span>
      </div>
      <Link to="/subscription" className="subscription-summary-link">
        View subscription →
      </Link>
    </div>
  );
}

export default Subscription;
