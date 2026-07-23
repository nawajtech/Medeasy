import { useCallback, useEffect, useState } from "react";
import {
  createReferralPartner,
  deleteReferralPartner,
  getReferralPartnerLedger,
  getReferralPartners,
  recordReferralPayout,
  updateReferralPartner,
} from "../api/referrals";
import { useAuth } from "../auth/AuthContext";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import { withCompanyScope } from "../utils/tenantPayload";
import "./Referrals.css";

const PARTNER_TYPES = [
  { value: "doctor", label: "Doctor" },
  { value: "clinic", label: "Clinic" },
  { value: "hospital", label: "Hospital" },
  { value: "agent", label: "Agent" },
];

const PAYOUT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "other", label: "Other" },
];

const emptyForm = {
  company_id: "",
  name: "",
  mobile: "",
  address: "",
  type: "doctor",
  surcharge_type: "",
  surcharge_value: "",
  is_active: true,
};

const emptyPayoutForm = {
  amount: "",
  paid_at: "",
  method: "cash",
  reference: "",
  notes: "",
};

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatExtraCommission(row) {
  if (!row.surcharge_type || Number(row.surcharge_value) <= 0) return "—";
  if (row.surcharge_type === "percentage") return `${Number(row.surcharge_value)}%`;
  return money(row.surcharge_value);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function ReferralPartners() {
  const { isSuperAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCompanyId, setFilterCompanyId] = useState("");

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerPartner, setLedgerPartner] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [payoutForm, setPayoutForm] = useState(emptyPayoutForm);
  const [payoutSaving, setPayoutSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { with_summary: true };
      if (isSuperAdmin && filterCompanyId) params.company_id = filterCompanyId;
      const { data } = await getReferralPartners(params);
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load referral partners."));
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, filterCompanyId]);

  const loadLedger = useCallback(async (partnerId) => {
    setLedgerLoading(true);
    setError("");
    try {
      const { data } = await getReferralPartnerLedger(partnerId);
      setLedger(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load commission ledger."));
    } finally {
      setLedgerLoading(false);
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
      company_id: String(row.company_id || ""),
      name: row.name || "",
      mobile: row.mobile || "",
      address: row.address || "",
      type: row.type || "doctor",
      surcharge_type: row.surcharge_type || "",
      surcharge_value: row.surcharge_value ?? "",
      is_active: Boolean(row.is_active),
    });
    setModalOpen(true);
  };

  const openLedger = async (row) => {
    setLedgerPartner(row);
    setLedger(null);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setPayoutForm({ ...emptyPayoutForm, paid_at: now.toISOString().slice(0, 16) });
    setLedgerOpen(true);
    await loadLedger(row.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = withCompanyScope({
        ...form,
        surcharge_type: form.surcharge_type || null,
        surcharge_value: form.surcharge_value === "" ? 0 : Number(form.surcharge_value),
      }, isSuperAdmin);
      if (editing) {
        await updateReferralPartner(editing.id, payload);
      } else {
        await createReferralPartner(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save referral partner."));
    } finally {
      setSaving(false);
    }
  };

  const handlePayout = async (e) => {
    e.preventDefault();
    if (!ledgerPartner) return;
    setPayoutSaving(true);
    setError("");
    try {
      await recordReferralPayout(ledgerPartner.id, {
        ...payoutForm,
        amount: Number(payoutForm.amount),
      });
      setPayoutForm((p) => ({ ...emptyPayoutForm, paid_at: p.paid_at, method: p.method }));
      await Promise.all([loadLedger(ledgerPartner.id), load()]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to record payout."));
    } finally {
      setPayoutSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete referral partner "${row.name}"?`)) return;
    try {
      await deleteReferralPartner(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete referral partner."));
    }
  };

  const summary = ledger?.summary;

  return (
    <section className="page-card ref-page">
      <div className="page-card-header">
        <h2>Referral By</h2>
        <p>Manage referral partners and track commission earned vs paid.</p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-toolbar">
        {isSuperAdmin && (
          <CompanySelect
            id="ref_filter_company"
            label=""
            value={filterCompanyId}
            onChange={(e) => setFilterCompanyId(e.target.value)}
            allLabel="All organizations"
          />
        )}
        <span>{loading ? "Loading…" : `${items.length} partner(s)`}</span>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          Add referral partner
        </button>
      </div>

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Type</th>
              <th>Extra comm.</th>
              <th>Earned</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr><td colSpan={9} className="crud-empty">No referral partners yet.</td></tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  {row.address && <div className="ref-address-preview">{row.address}</div>}
                </td>
                <td>{row.mobile || "—"}</td>
                <td><span className="ref-type-pill">{row.type}</span></td>
                <td>{formatExtraCommission(row)}</td>
                <td>{money(row.total_earned)}</td>
                <td>{money(row.total_paid)}</td>
                <td><strong className={Number(row.balance_pending) > 0 ? "ref-balance-due" : ""}>{money(row.balance_pending)}</strong></td>
                <td>
                  <span className={`crud-badge ${row.is_active ? "crud-badge--active" : "crud-badge--inactive"}`}>
                    {row.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openLedger(row)}>Track</button>
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleDelete(row)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal title={editing ? "Edit referral partner" : "Add referral partner"} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            {isSuperAdmin && (
              <div className="crud-field crud-field--full">
                <label>Organization *</label>
                <CompanySelect name="company_id" value={form.company_id} onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))} required />
              </div>
            )}
            <div className="crud-field">
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Partner name" />
            </div>
            <div className="crud-field">
              <label>Mobile</label>
              <input value={form.mobile} onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))} placeholder="+91…" />
            </div>
            <div className="crud-field crud-field--full">
              <label>Address</label>
              <textarea rows={2} value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" />
            </div>
            <div className="crud-field">
              <label>Type *</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} required>
                {PARTNER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="crud-field">
              <label>Extra commission type</label>
              <select value={form.surcharge_type} onChange={(e) => setForm((p) => ({ ...p, surcharge_type: e.target.value }))}>
                <option value="">None (normal commission only)</option>
                <option value="fixed">Fixed (₹)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
            <div className="crud-field">
              <label>Extra commission value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.surcharge_value}
                onChange={(e) => setForm((p) => ({ ...p, surcharge_value: e.target.value }))}
                disabled={!form.surcharge_type}
                placeholder="Extra commission value"
              />
            </div>
            <div className="crud-field">
              <label className="crud-checkbox">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
                Active
              </label>
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Commission track — ${ledgerPartner?.name || ""}`}
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
      >
        {ledgerLoading && !ledger && <p className="crud-empty">Loading ledger…</p>}
        {ledger && (
          <>
            <div className="ref-ledger-summary">
              <div className="ref-ledger-stat">
                <span className="ref-ledger-stat__label">Total earned</span>
                <strong>{money(summary?.total_earned)}</strong>
              </div>
              <div className="ref-ledger-stat">
                <span className="ref-ledger-stat__label">Total paid</span>
                <strong>{money(summary?.total_paid)}</strong>
              </div>
              <div className="ref-ledger-stat ref-ledger-stat--balance">
                <span className="ref-ledger-stat__label">Balance pending</span>
                <strong>{money(summary?.balance_pending)}</strong>
              </div>
            </div>

            <h4 className="ref-ledger-heading">Commission from orders ({summary?.order_count || 0})</h4>
            <div className="ref-ledger-table-wrap">
              <table className="crud-table ref-ledger-table">
                <thead>
                  <tr><th>Date</th><th>Order</th><th>Patient</th><th>Test</th><th>Commission</th></tr>
                </thead>
                <tbody>
                  {!ledger.commissions?.length && (
                    <tr><td colSpan={5} className="crud-empty">No commission recorded yet.</td></tr>
                  )}
                  {ledger.commissions?.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.order_number}</td>
                      <td>{row.patient_name || "—"}</td>
                      <td>{row.test_name || "—"}</td>
                      <td>{money(row.commission)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="ref-ledger-heading">Payout history ({summary?.payout_count || 0})</h4>
            <div className="ref-ledger-table-wrap">
              <table className="crud-table ref-ledger-table">
                <thead>
                  <tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>By</th></tr>
                </thead>
                <tbody>
                  {!ledger.payouts?.length && (
                    <tr><td colSpan={5} className="crud-empty">No payouts recorded yet.</td></tr>
                  )}
                  {ledger.payouts?.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.paid_at)}</td>
                      <td>{money(row.amount)}</td>
                      <td>{row.method}</td>
                      <td>{row.reference || "—"}</td>
                      <td>{row.recorded_by || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {Number(summary?.balance_pending) > 0 && (
              <form className="ref-payout-form" onSubmit={handlePayout}>
                <h4 className="ref-ledger-heading">Record payout</h4>
                <div className="crud-form-grid">
                  <div className="crud-field">
                    <label>Amount (₹) *</label>
                    <input
                      type="number"
                      min="0.01"
                      max={summary.balance_pending}
                      step="0.01"
                      required
                      value={payoutForm.amount}
                      onChange={(e) => setPayoutForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="Amount (₹)"
                    />
                  </div>
                  <div className="crud-field">
                    <label>Paid on *</label>
                    <input
                      type="datetime-local"
                      required
                      value={payoutForm.paid_at}
                      onChange={(e) => setPayoutForm((p) => ({ ...p, paid_at: e.target.value }))}
                      placeholder="Paid on"
                    />
                  </div>
                  <div className="crud-field">
                    <label>Method</label>
                    <select value={payoutForm.method} onChange={(e) => setPayoutForm((p) => ({ ...p, method: e.target.value }))}>
                      {PAYOUT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="crud-field">
                    <label>Reference</label>
                    <input value={payoutForm.reference} onChange={(e) => setPayoutForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Txn / UTR no." />
                  </div>
                  <div className="crud-field crud-field--full">
                    <label>Notes</label>
                    <input value={payoutForm.notes} onChange={(e) => setPayoutForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" />
                  </div>
                </div>
                <div className="crud-modal-actions">
                  <button type="submit" className="crud-btn crud-btn--primary" disabled={payoutSaving}>
                    {payoutSaving ? "Saving…" : "Record payout"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
        <div className="crud-modal-actions">
          <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setLedgerOpen(false)}>Close</button>
        </div>
      </Modal>
    </section>
  );
}

export default ReferralPartners;
