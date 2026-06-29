import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createExpense,
  deleteExpense,
  getExpenses,
  getFinancialSummary,
} from "../api/financials";
import { getCompaniesList } from "../api/companiesList";
import { getDoctors } from "../api/doctors";
import BranchSelect from "../components/BranchSelect";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import { useAuth } from "../auth/AuthContext";
import { PERMISSIONS } from "../config/permissions";
import { usePermissions } from "../hooks/usePermissions";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import { withCompanyScope } from "../utils/tenantPayload";
import "./FinancialReport.css";

const EXPENSE_CATEGORIES = [
  { value: "salary", label: "Salary & wages" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies & consumables" },
  { value: "equipment", label: "Equipment" },
  { value: "marketing", label: "Marketing" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

const emptyExpense = {
  company_id: "",
  branch_id: "",
  category: "other",
  description: "",
  amount: "",
  expense_date: "",
  payment_method: "",
  notes: "",
};

function formatLocalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function money(n) {
  const v = Number(n || 0);
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function FinancialReport() {
  const { isSuperAdmin, companyId: authCompanyId, user } = useAuth();
  const { can } = usePermissions();
  const canCreateExpense = can(PERMISSIONS.FINANCIAL_CREATE);
  const canDeleteExpense = can(PERMISSIONS.FINANCIAL_DELETE);

  const today = formatLocalDate(new Date());
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [companyId, setCompanyId] = useState(isSuperAdmin ? "" : String(authCompanyId || ""));
  const [branchId, setBranchId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState([]);

  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ ...emptyExpense, expense_date: today });
  const [expenseSaving, setExpenseSaving] = useState(false);

  const effectiveCompanyId = isSuperAdmin ? companyId : String(authCompanyId || "");

  useEffect(() => {
    if (!isSuperAdmin) return;
    getCompaniesList()
      .then((res) => {
        if (res.data.length > 0) {
          setCompanyId((current) => current || String(res.data[0].id));
        }
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!effectiveCompanyId) {
      setDoctors([]);
      return;
    }
    getDoctors({ company_id: effectiveCompanyId })
      .then((res) => setDoctors(res.data || []))
      .catch(() => setDoctors([]));
  }, [effectiveCompanyId]);

  const queryParams = useMemo(() => {
    const p = { date_from: dateFrom, date_to: dateTo };
    if (effectiveCompanyId) p.company_id = effectiveCompanyId;
    if (branchId) p.branch_id = branchId;
    if (doctorId) p.doctor_id = doctorId;
    return p;
  }, [dateFrom, dateTo, effectiveCompanyId, branchId, doctorId]);

  const load = useCallback(async () => {
    if (!effectiveCompanyId) {
      setSummary(null);
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [summaryRes, expenseRes] = await Promise.all([
        getFinancialSummary(queryParams),
        getExpenses(queryParams),
      ]);
      setSummary(summaryRes.data);
      setExpenses(expenseRes.data?.data || expenseRes.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load financial report."));
      setSummary(null);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [queryParams, effectiveCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCompanyChange = (e) => {
    setCompanyId(e.target.value);
    setBranchId("");
    setDoctorId("");
  };

  const setPreset = (days) => {
    const end = new Date();
    const start = new Date();
    if (days === 1) {
      const d = formatLocalDate(end);
      setDateFrom(d);
      setDateTo(d);
      return;
    }
    start.setDate(end.getDate() - (days - 1));
    setDateFrom(formatLocalDate(start));
    setDateTo(formatLocalDate(end));
  };

  const handleExpenseSave = async (e) => {
    e.preventDefault();
    setExpenseSaving(true);
    setError("");
    try {
      const payload = withCompanyScope(
        {
          ...expenseForm,
          amount: Number(expenseForm.amount),
          branch_id: expenseForm.branch_id || null,
        },
        isSuperAdmin
      );
      await createExpense(payload);
      setExpenseModalOpen(false);
      setExpenseForm({ ...emptyExpense, expense_date: today });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save expense."));
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleExpenseDelete = async (row) => {
    if (!window.confirm(`Delete expense ${money(row.amount)}?`)) return;
    try {
      await deleteExpense(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete expense."));
    }
  };

  const activePreset = useMemo(() => {
    if (dateFrom === today && dateTo === today) return 1;
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);
    const diff = Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1;
    if (dateTo === today && [7, 30].includes(diff)) return diff;
    return null;
  }, [dateFrom, dateTo, today]);

  const scope = summary?.scope;
  const organisationName = scope?.company_name || user?.company?.name || "Organisation";

  return (
    <section className="page-card fin-page">
      <div className="page-card-header">
        <h2>Finance &amp; P&amp;L</h2>
        <p>
          Company totals with branch, doctor, and date filters — profit margin, commissions, gains vs expenses.
        </p>
      </div>

      <div className="fin-toolbar">
        {isSuperAdmin ? (
          <label className="fin-filter-field">
            <span>Organisation</span>
            <CompanySelect
              id="fin_company"
              value={companyId}
              onChange={handleCompanyChange}
              variant="inline"
              label=""
              allowAll={false}
            />
          </label>
        ) : (
          <div className="fin-scope-chip">
            <span className="fin-scope-chip__label">Organisation</span>
            <strong>{organisationName}</strong>
          </div>
        )}

        <label className="fin-filter-field">
          <span>Branch</span>
          <BranchSelect
            id="fin_branch"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            companyId={effectiveCompanyId}
            allowAll
            allLabel="All branches"
            disabled={!effectiveCompanyId}
          />
        </label>

        <label className="fin-filter-field">
          <span>Doctor</span>
          <select
            id="fin_doctor"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            disabled={!effectiveCompanyId}
          >
            <option value="">All doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.user?.name || `Doctor #${d.id}`}
              </option>
            ))}
          </select>
        </label>

        <label className="fin-filter-field">
          <span>From</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="fin-filter-field">
          <span>To</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>

        <div className="fin-presets">
          <button type="button" className={activePreset === 1 ? "is-active" : ""} onClick={() => setPreset(1)}>Today</button>
          <button type="button" className={activePreset === 7 ? "is-active" : ""} onClick={() => setPreset(7)}>Last 7 days</button>
          <button type="button" className={activePreset === 30 ? "is-active" : ""} onClick={() => setPreset(30)}>Last 30 days</button>
        </div>
      </div>

      {scope && effectiveCompanyId && (
        <div className="fin-active-scope">
          Showing totals for <strong>{scope.company_name}</strong>
          {scope.branch_name ? <> · Branch: <strong>{scope.branch_name}</strong></> : null}
          {scope.doctor_name ? <> · Doctor: <strong>{scope.doctor_name}</strong></> : null}
          <> · {summary.date_range?.from === summary.date_range?.to ? summary.date_range.from : `${summary.date_range.from} → ${summary.date_range.to}`}</>
        </div>
      )}

      {!effectiveCompanyId && isSuperAdmin && (
        <p className="crud-empty">Select an organisation to view the financial report.</p>
      )}

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      {loading && effectiveCompanyId && <p className="crud-empty">Loading financial report…</p>}

      {!loading && summary && effectiveCompanyId && (
        <>
          <div className="fin-kpi-grid">
            <div className="fin-kpi fin-kpi--gain">
              <div className="fin-kpi__label">Total gain (revenue)</div>
              <div className="fin-kpi__value">{money(summary.gains?.total)}</div>
            </div>
            <div className="fin-kpi fin-kpi--expense">
              <div className="fin-kpi__label">Total expenses</div>
              <div className="fin-kpi__value">{money(summary.expenses?.total)}</div>
            </div>
            <div className="fin-kpi fin-kpi--profit">
              <div className="fin-kpi__label">Net profit</div>
              <div className={`fin-kpi__value ${summary.net_profit >= 0 ? "positive" : "negative"}`}>
                {money(summary.net_profit)}
              </div>
            </div>
            <div className="fin-kpi fin-kpi--margin">
              <div className="fin-kpi__label">Profit margin</div>
              <div className={`fin-kpi__value ${summary.margin_percent >= 0 ? "positive" : "negative"}`}>
                {summary.margin_percent}%
              </div>
            </div>
          </div>

          <div className="fin-panels">
            <div className="fin-panel">
              <div className="fin-panel__head">Gains breakdown</div>
              <div className="fin-panel__body">
                <div className="fin-row"><span>Appointment billing collected</span><strong>{money(summary.gains?.appointment_billing)}</strong></div>
                <div className="fin-row"><span>Diagnostic orders (collected)</span><strong>{money(summary.gains?.diagnostic_orders)}</strong></div>
                <div className="fin-row"><span>Lab orders (net)</span><strong>{money(summary.gains?.lab_orders)}</strong></div>
                <div className="fin-row fin-row--total"><span>Total gain</span><strong>{money(summary.gains?.total)}</strong></div>
              </div>
            </div>

            <div className="fin-panel">
              <div className="fin-panel__head">Expenses breakdown</div>
              <div className="fin-panel__body">
                <div className="fin-row"><span>Referral commission (orders)</span><strong>{money(summary.expenses?.referral_commission)}</strong></div>
                <div className="fin-row"><span>Doctor commission (orders)</span><strong>{money(summary.expenses?.doctor_commission)}</strong></div>
                <div className="fin-row"><span>Other expenses</span><strong>{money(summary.expenses?.other_expenses)}</strong></div>
                <div className="fin-row fin-row--total"><span>Total expense</span><strong>{money(summary.expenses?.total)}</strong></div>
                <p className="fin-note">Referral payouts (cash): {money(summary.referral_payouts_cash)} — shown separately; not double-counted above.</p>
              </div>
            </div>

            <div className="fin-panel">
              <div className="fin-panel__head">Referral summary</div>
              <div className="fin-panel__body">
                <div className="fin-row"><span>Orders with referral</span><strong>{summary.referral_summary?.orders_with_referral || 0}</strong></div>
                <div className="fin-row"><span>Commission accrued</span><strong>{money(summary.referral_summary?.commission_accrued)}</strong></div>
                <div className="fin-row"><span>Payouts made</span><strong>{money(summary.referral_summary?.payouts_made)}</strong></div>
              </div>
            </div>
          </div>

          <h3 className="fin-section-title">Doctor commission</h3>
          <div className="fin-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {!summary.doctor_commissions?.length && (
                  <tr><td colSpan={4} className="crud-empty">No doctor commission in this period. Set doctor commission per test in Diagnostic Catalog.</td></tr>
                )}
                {summary.doctor_commissions?.map((row) => (
                  <tr key={row.doctor_id ?? row.doctor_name}>
                    <td><strong>{row.doctor_name}</strong></td>
                    <td>{row.order_count}</td>
                    <td>{money(row.revenue)}</td>
                    <td>{money(row.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="fin-expense-header">
            <h3 className="fin-section-title" style={{ margin: 0 }}>Other expenses</h3>
            {canCreateExpense && (
              <button
                type="button"
                className="crud-btn crud-btn--primary crud-btn--sm"
                onClick={() => {
                  setExpenseForm({
                    ...emptyExpense,
                    expense_date: dateTo,
                    company_id: effectiveCompanyId,
                    branch_id: branchId,
                  });
                  setExpenseModalOpen(true);
                }}
              >
                + Record expense
              </button>
            )}
          </div>
          <div className="fin-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Branch</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Method</th>
                  {canDeleteExpense && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {!expenses.length && (
                  <tr><td colSpan={canDeleteExpense ? 7 : 6} className="crud-empty">No other expenses recorded for this period{branchId ? " at this branch" : ""}.</td></tr>
                )}
                {expenses.map((row) => (
                  <tr key={row.id}>
                    <td>{row.expense_date?.slice?.(0, 10) || row.expense_date}</td>
                    <td>{row.branch?.name || "—"}</td>
                    <td>{EXPENSE_CATEGORIES.find((c) => c.value === row.category)?.label || row.category}</td>
                    <td>{row.description || "—"}</td>
                    <td>{money(row.amount)}</td>
                    <td>{row.payment_method || "—"}</td>
                    {canDeleteExpense && (
                      <td>
                        <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleExpenseDelete(row)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal title="Record expense" open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)}>
        <form onSubmit={handleExpenseSave}>
          <div className="crud-form-grid">
            {isSuperAdmin && (
              <div className="crud-field crud-field--full">
                <label>Organisation *</label>
                <CompanySelect
                  name="company_id"
                  value={expenseForm.company_id}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, company_id: e.target.value, branch_id: "" }))}
                  required
                />
              </div>
            )}
            <div className="crud-field">
              <label>Branch</label>
              <BranchSelect
                value={expenseForm.branch_id}
                onChange={(e) => setExpenseForm((p) => ({ ...p, branch_id: e.target.value }))}
                companyId={expenseForm.company_id || effectiveCompanyId}
                allowAll
                allLabel="Organisation-wide"
              />
            </div>
            <div className="crud-field">
              <label>Category *</label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
                required
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label>Date *</label>
              <input
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm((p) => ({ ...p, expense_date: e.target.value }))}
                required
              />
            </div>
            <div className="crud-field">
              <label>Amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
            </div>
            <div className="crud-field">
              <label>Payment method</label>
              <input
                value={expenseForm.payment_method}
                onChange={(e) => setExpenseForm((p) => ({ ...p, payment_method: e.target.value }))}
                placeholder="Cash, UPI, bank…"
              />
            </div>
            <div className="crud-field crud-field--full">
              <label>Description</label>
              <input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Staff salary, electricity bill"
              />
            </div>
            <div className="crud-field crud-field--full">
              <label>Notes</label>
              <textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setExpenseModalOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={expenseSaving}>
              {expenseSaving ? "Saving…" : "Save expense"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default FinancialReport;
