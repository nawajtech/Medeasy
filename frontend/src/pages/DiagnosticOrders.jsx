import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDiagnosticCategories,
  getDiagnosticTypes, getDiagnosticOrders, getDiagnosticOrder,
  createDiagnosticOrder, scheduleDiagnosticOrder, startDiagnosticOrder,
  uploadDiagnosticReport, approveDiagnosticReport, cancelDiagnosticOrder,
} from "../api/diagnostics";
import { getPatients } from "../api/patients";
import Modal from "../components/crud/Modal";
import BranchSelect from "../components/BranchSelect";
import CompanySelect from "../components/CompanySelect";
import { useAuth } from "../auth/AuthContext";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./DiagnosticOrders.css";

const PRIORITIES = ["routine", "urgent", "emergency"];

const STATUS_META = {
  booked:      { label: "Booked",      color: "dgn-booked" },
  scheduled:   { label: "Scheduled",   color: "dgn-scheduled" },
  in_progress: { label: "In Progress", color: "dgn-progress" },
  completed:   { label: "Completed",   color: "dgn-completed" },
  cancelled:   { label: "Cancelled",   color: "dgn-cancelled" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: "" };
  return <span className={`dgn-status ${meta.color}`}>{meta.label}</span>;
}

function DiagnosticOrders() {
  const { isDoctor, isSuperAdmin } = useAuth();

  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [orderForm, setOrderForm] = useState({
    company_id: "", patient_id: "", branch_id: "", test_type_id: "",
    priority: "routine", clinical_notes: "", notes: "",
  });

  const [detailOrder, setDetailOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ scheduled_at: "" });
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ findings: "", impression: "", recommendations: "" });

  const loadCatalog = useCallback(async (companyId) => {
    const params = companyId ? { company_id: companyId } : {};
    const [catRes, typeRes] = await Promise.all([
      getDiagnosticCategories(params),
      getDiagnosticTypes(params),
    ]);
    setCategories(catRes.data);
    setTypes(typeRes.data);
    return { categories: catRes.data, types: typeRes.data };
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getDiagnosticOrders({
        status: statusFilter || undefined,
        category_id: categoryFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        branch_id: branchFilter || undefined,
      });
      setOrders(data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, dateFrom, dateTo, branchFilter]);

  useEffect(() => {
    loadOrders();
    loadCatalog().catch(() => {});
  }, [loadOrders, loadCatalog]);

  const testsByCategory = useMemo(() => {
    const map = new Map();
    for (const cat of categories) {
      map.set(cat.id, { category: cat, tests: [] });
    }
    for (const test of types) {
      const key = test.category_id;
      if (!map.has(key)) {
        map.set(key, {
          category: test.category || { id: key, name: "Uncategorized" },
          tests: [],
        });
      }
      map.get(key).tests.push(test);
    }
    return [...map.values()].sort(
      (a, b) => (a.category.sort_order ?? 0) - (b.category.sort_order ?? 0)
        || String(a.category.name).localeCompare(String(b.category.name))
    );
  }, [categories, types]);

  const loadCreatePatients = async (companyId = "") => {
    try {
      const params = { per_page: 500, ...(companyId ? { company_id: companyId } : {}) };
      const { data } = await getPatients(params);
      setPatients(data.data || data);
    } catch {
      setPatients([]);
    }
  };

  const openCreate = async () => {
    setPatients([]);
    setOrderForm({
      company_id: "", patient_id: "", branch_id: "", test_type_id: "",
      priority: "routine", clinical_notes: "", notes: "",
    });
    setCreateOpen(true);
    await Promise.allSettled([loadCreatePatients(""), loadCatalog()]);
  };

  const handleOrderCompanyChange = async (e) => {
    const cid = e.target.value;
    setOrderForm((p) => ({ ...p, company_id: cid, patient_id: "", branch_id: "", test_type_id: "" }));
    setPatients([]);
    await Promise.allSettled([loadCreatePatients(cid), loadCatalog(cid)]);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createDiagnosticOrder(orderForm);
      setCreateOpen(false);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create order."));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (order) => {
    setDetailOpen(true);
    try {
      const { data } = await getDiagnosticOrder(order.id);
      setDetailOrder(data);
    } catch {
      setDetailOrder(order);
    }
  };

  const openSchedule = (order) => {
    setDetailOrder(order);
    setScheduleForm({ scheduled_at: "" });
    setScheduleOpen(true);
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await scheduleDiagnosticOrder(detailOrder.id, scheduleForm);
      setScheduleOpen(false);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to schedule."));
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (order) => {
    if (!window.confirm("Mark as in progress?")) return;
    try {
      await startDiagnosticOrder(order.id);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to start."));
    }
  };

  const openReport = (order) => {
    setDetailOrder(order);
    setReportForm({
      findings: order.report?.findings || "",
      impression: order.report?.impression || "",
      recommendations: order.report?.recommendations || "",
    });
    setReportOpen(true);
  };

  const handleReport = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await uploadDiagnosticReport(detailOrder.id, reportForm);
      setReportOpen(false);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to submit report."));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (order) => {
    if (!window.confirm("Approve this diagnostic report?")) return;
    try {
      await approveDiagnosticReport(order.id);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to approve."));
    }
  };

  const handleCancel = async (order) => {
    if (!window.confirm(`Cancel order ${order.order_number}?`)) return;
    try {
      await cancelDiagnosticOrder(order.id);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to cancel."));
    }
  };

  const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN") : "—");

  const renderTestSelectOptions = () => {
    const active = types.filter((t) => t.is_active);
    if (!active.length) {
      return (
        <option value="">No tests — add categories & tests first</option>
      );
    }
    return (
      <>
        <option value="">Select test</option>
        {testsByCategory.map(({ category, tests }) => {
          const group = tests.filter((t) => t.is_active);
          if (!group.length) return null;
          return (
            <optgroup key={category.id} label={category.name}>
              {group.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — ₹{Number(t.price).toLocaleString("en-IN")}
                </option>
              ))}
            </optgroup>
          );
        })}
      </>
    );
  };

  return (
    <section className="page-card dgn-page">
      <div className="page-card-header">
        <h2>Diagnostic Orders</h2>
        <p>Book, schedule, and manage diagnostic test orders for patients.</p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-toolbar lab-orders-toolbar">
        <div className="lab-orders-filters">
          <select className="crud-btn crud-btn--ghost" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </select>
          <select className="crud-btn crud-btn--ghost" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From" />
          <span>–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To" />
          <BranchSelect value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} allLabel="All branches" id="dgn_branch_filter" name="dgn_branch_filter" />
        </div>
        {!isDoctor && (
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>New order</button>
        )}
      </div>

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr><th>Order #</th><th>Patient</th><th>Branch</th><th>Category</th><th>Test</th><th>Priority</th><th>Status</th><th>Scheduled</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {!loading && orders.length === 0 && (
              <tr><td colSpan={9} className="crud-empty">No diagnostic orders found.</td></tr>
            )}
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong className="lab-order-num">{order.order_number}</strong></td>
                <td>{order.patient?.name || "—"}</td>
                <td>{order.branch ? <span className="branch-pill">{order.branch.name}</span> : "—"}</td>
                <td>{order.test_type?.category?.name || "—"}</td>
                <td><strong>{order.test_type?.name || "—"}</strong></td>
                <td><span className={`dgn-priority dgn-priority-${order.priority}`}>{order.priority}</span></td>
                <td><StatusBadge status={order.status} /></td>
                <td>{formatDate(order.scheduled_at)}</td>
                <td>
                  <div className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openDetail(order)}>View</button>
                    {order.status === "booked" && <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openSchedule(order)}>Schedule</button>}
                    {order.status === "scheduled" && <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => handleStart(order)}>Start</button>}
                    {order.status === "in_progress" && <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openReport(order)}>Enter report</button>}
                    {order.status === "completed" && !order.report?.approved_at && <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => handleApprove(order)}>Approve</button>}
                    {!["completed", "cancelled"].includes(order.status) && <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleCancel(order)}>Cancel</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal title="New diagnostic order" open={createOpen} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreateOrder}>
          <div className="crud-form-grid">
            {isSuperAdmin && (
              <CompanySelect id="do_company" label="Company *" value={orderForm.company_id} onChange={handleOrderCompanyChange} required />
            )}
            <div className="crud-field crud-field--full">
              <label htmlFor="do_patient">Patient *</label>
              <select id="do_patient" value={orderForm.patient_id} onChange={(e) => setOrderForm((p) => ({ ...p, patient_id: e.target.value }))} required>
                <option value="">Select patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` — ${p.phone}` : ""}</option>)}
              </select>
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="do_type">Test *</label>
              <select id="do_type" value={orderForm.test_type_id} onChange={(e) => setOrderForm((p) => ({ ...p, test_type_id: e.target.value }))} required>
                {renderTestSelectOptions()}
              </select>
            </div>
            <div className="crud-field">
              <label>Branch</label>
              <BranchSelect id="do_branch" name="branch_id" value={orderForm.branch_id} onChange={(e) => setOrderForm((p) => ({ ...p, branch_id: e.target.value }))} allLabel="Any branch" />
            </div>
            <div className="crud-field">
              <label htmlFor="do_priority">Priority</label>
              <select id="do_priority" value={orderForm.priority} onChange={(e) => setOrderForm((p) => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            {orderForm.test_type_id && (() => {
              const sel = types.find((t) => t.id === Number(orderForm.test_type_id));
              if (!sel) return null;
              return (
                <div className="crud-field crud-field--full">
                  <div className="lo-bill-panel">
                    <div className="lo-bill-title">Bill</div>
                    <div className="lo-bill-row">
                      <span>{sel.category?.name} — {sel.name}</span>
                      <span>₹{Number(sel.price).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="crud-field">
              <label htmlFor="do_clinical">Clinical notes</label>
              <input id="do_clinical" value={orderForm.clinical_notes} onChange={(e) => setOrderForm((p) => ({ ...p, clinical_notes: e.target.value }))} />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="do_notes">Notes</label>
              <textarea id="do_notes" rows={2} value={orderForm.notes} onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Creating…" : "Create order"}</button>
          </div>
        </form>
      </Modal>

      <Modal title={`Schedule — ${detailOrder?.order_number || ""}`} open={scheduleOpen} onClose={() => setScheduleOpen(false)}>
        <form onSubmit={handleSchedule}>
          <div className="crud-field crud-field--full">
            <label htmlFor="sch_at">Scheduled date & time *</label>
            <input id="sch_at" type="datetime-local" required value={scheduleForm.scheduled_at} onChange={(e) => setScheduleForm({ scheduled_at: e.target.value })} />
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setScheduleOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : "Confirm"}</button>
          </div>
        </form>
      </Modal>

      <Modal title={`Enter report — ${detailOrder?.order_number || ""}`} open={reportOpen} onClose={() => setReportOpen(false)}>
        <form onSubmit={handleReport}>
          <div className="crud-field crud-field--full">
            <label>Findings</label>
            <textarea rows={4} value={reportForm.findings} onChange={(e) => setReportForm((p) => ({ ...p, findings: e.target.value }))} />
          </div>
          <div className="crud-field crud-field--full">
            <label>Impression</label>
            <textarea rows={3} value={reportForm.impression} onChange={(e) => setReportForm((p) => ({ ...p, impression: e.target.value }))} />
          </div>
          <div className="crud-field crud-field--full">
            <label>Recommendations</label>
            <textarea rows={2} value={reportForm.recommendations} onChange={(e) => setReportForm((p) => ({ ...p, recommendations: e.target.value }))} />
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setReportOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : "Submit"}</button>
          </div>
        </form>
      </Modal>

      <Modal title={`Order — ${detailOrder?.order_number || ""}`} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detailOrder && (
          <div className="lab-detail">
            <dl className="lab-detail-grid">
              <div><dt>Patient</dt><dd>{detailOrder.patient?.name || "—"}</dd></div>
              <div><dt>Category</dt><dd>{detailOrder.test_type?.category?.name || "—"}</dd></div>
              <div><dt>Test</dt><dd>{detailOrder.test_type?.name || "—"}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={detailOrder.status} /></dd></div>
              <div><dt>Amount</dt><dd>₹{Number(detailOrder.amount || 0).toLocaleString("en-IN")}</dd></div>
            </dl>
          </div>
        )}
        <div className="crud-modal-actions">
          <button type="button" className="crud-btn crud-btn--primary" onClick={() => setDetailOpen(false)}>Close</button>
        </div>
      </Modal>
    </section>
  );
}

export default DiagnosticOrders;
