import { useCallback, useEffect, useState } from "react";
import {
  getDiagnosticTypes, getDiagnosticOrders, getDiagnosticOrder,
  createDiagnosticOrder, scheduleDiagnosticOrder, startDiagnosticOrder,
  uploadDiagnosticReport, approveDiagnosticReport, cancelDiagnosticOrder,
  createDiagnosticType, updateDiagnosticType, deleteDiagnosticType,
} from "../api/diagnostics";
import { getPatients } from "../api/patients";
import Modal from "../components/crud/Modal";
import { useAuth } from "../auth/AuthContext";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./DiagnosticOrders.css";

const MODALITIES = ["xray", "ct", "mri", "ultrasound", "ecg", "echo", "other"];
const MODALITY_LABELS = { xray: "X-Ray", ct: "CT Scan", mri: "MRI", ultrasound: "Ultrasound", ecg: "ECG", echo: "Echo", other: "Other" };
const PRIORITIES = ["routine", "urgent", "emergency"];

const STATUS_META = {
  booked:      { label: "Booked",      color: "dgn-booked" },
  scheduled:   { label: "Scheduled",   color: "dgn-scheduled" },
  in_progress: { label: "In Progress", color: "dgn-progress" },
  completed:   { label: "Completed",   color: "dgn-completed" },
  cancelled:   { label: "Cancelled",   color: "dgn-cancelled" },
};

const TABS = ["Orders", "Test Types"];

const emptyType = { name: "", code: "", modality: "xray", description: "", preparation_instructions: "", price: "", is_active: true };

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: "" };
  return <span className={`dgn-status ${meta.color}`}>{meta.label}</span>;
}

function DiagnosticOrders() {
  const { isDoctor } = useAuth();
  const [tab, setTab] = useState("Orders");

  // Orders state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalityFilter, setModalityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Types state
  const [types, setTypes] = useState([]);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState(emptyType);
  const [saving, setSaving] = useState(false);

  // Create order
  const [createOpen, setCreateOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [orderForm, setOrderForm] = useState({ patient_id: "", test_type_id: "", priority: "routine", clinical_notes: "", notes: "" });

  // Detail
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Schedule
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ scheduled_at: "" });

  // Report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ findings: "", impression: "", recommendations: "" });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getDiagnosticOrders({
        status: statusFilter || undefined,
        modality: modalityFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setOrders(data.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load orders."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, modalityFilter, dateFrom, dateTo]);

  const loadTypes = useCallback(async () => {
    try {
      const { data } = await getDiagnosticTypes();
      setTypes(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (tab === "Orders") loadOrders();
    else loadTypes();
  }, [tab, loadOrders, loadTypes]);

  const openCreate = async () => {
    const [pRes] = await Promise.all([getPatients({ per_page: 500 }), loadTypes()]);
    setPatients(pRes.data.data || pRes.data);
    setOrderForm({ patient_id: "", test_type_id: "", priority: "routine", clinical_notes: "", notes: "" });
    setCreateOpen(true);
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
    setReportForm({ findings: order.report?.findings || "", impression: order.report?.impression || "", recommendations: order.report?.recommendations || "" });
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

  // Type CRUD
  const openTypeCreate = () => { setEditingType(null); setTypeForm(emptyType); setTypeModalOpen(true); };
  const openTypeEdit = (row) => {
    setEditingType(row);
    setTypeForm({ name: row.name, code: row.code || "", modality: row.modality, description: row.description || "",
      preparation_instructions: row.preparation_instructions || "", price: row.price, is_active: Boolean(row.is_active) });
    setTypeModalOpen(true);
  };
  const handleTypeSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      editingType ? await updateDiagnosticType(editingType.id, typeForm) : await createDiagnosticType(typeForm);
      setTypeModalOpen(false);
      await loadTypes();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save type."));
    } finally {
      setSaving(false);
    }
  };
  const handleTypeDelete = async (row) => {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    try {
      await deleteDiagnosticType(row.id);
      await loadTypes();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete."));
    }
  };

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-IN") : "—";
  const formatDateTime = (iso) => iso ? new Date(iso).toLocaleString("en-IN") : "—";

  return (
    <section className="page-card dgn-page">
      <div className="page-card-header">
        <h2>Diagnostics</h2>
        <p>Manage radiology and diagnostic orders — X-Ray, CT, MRI, Ultrasound, ECG, Echo.</p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="lab-tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={`lab-tab ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>
            {t}
            <span className="lab-tab-count">{t === "Orders" ? orders.length : types.length}</span>
          </button>
        ))}
      </div>

      {/* ── ORDERS TAB ── */}
      {tab === "Orders" && (
        <>
          <div className="crud-toolbar lab-orders-toolbar">
            <div className="lab-orders-filters">
              <select className="crud-btn crud-btn--ghost" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
              </select>
              <select className="crud-btn crud-btn--ghost" value={modalityFilter} onChange={(e) => setModalityFilter(e.target.value)}>
                <option value="">All modalities</option>
                {MODALITIES.map((m) => <option key={m} value={m}>{MODALITY_LABELS[m]}</option>)}
              </select>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From" />
              <span>–</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To" />
            </div>
            {!isDoctor && (
              <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>New order</button>
            )}
          </div>

          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr><th>Order #</th><th>Patient</th><th>Test</th><th>Priority</th><th>Status</th><th>Scheduled</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {!loading && orders.length === 0 && (
                  <tr><td colSpan={7} className="crud-empty">No diagnostic orders found.</td></tr>
                )}
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><strong className="lab-order-num">{order.order_number}</strong></td>
                    <td>{order.patient?.name || "—"}</td>
                    <td>
                      <div>{order.test_type?.name || "—"}</div>
                      <span className={`dgn-modality dgn-modality-${order.test_type?.modality}`}>
                        {MODALITY_LABELS[order.test_type?.modality] || order.test_type?.modality}
                      </span>
                    </td>
                    <td><span className={`dgn-priority dgn-priority-${order.priority}`}>{order.priority}</span></td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>{formatDate(order.scheduled_at)}</td>
                    <td>
                      <div className="crud-actions">
                        <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openDetail(order)}>View</button>
                        {order.status === "booked" && (
                          <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openSchedule(order)}>Schedule</button>
                        )}
                        {order.status === "scheduled" && (
                          <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => handleStart(order)}>Start</button>
                        )}
                        {order.status === "in_progress" && (
                          <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openReport(order)}>Enter report</button>
                        )}
                        {order.status === "completed" && !order.report?.approved_at && (
                          <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => handleApprove(order)}>Approve</button>
                        )}
                        {!["completed", "cancelled"].includes(order.status) && (
                          <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleCancel(order)}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TEST TYPES TAB ── */}
      {tab === "Test Types" && (
        <>
          <div className="crud-toolbar">
            <span>{types.length} type(s)</span>
            <button type="button" className="crud-btn crud-btn--primary" onClick={openTypeCreate}>Add type</button>
          </div>
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead><tr><th>Name</th><th>Modality</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {types.length === 0 && <tr><td colSpan={5} className="crud-empty">No types yet. Add X-Ray, CT Scan, etc.</td></tr>}
                {types.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong>{t.code && <span className="lab-code"> ({t.code})</span>}</td>
                    <td><span className={`dgn-modality dgn-modality-${t.modality}`}>{MODALITY_LABELS[t.modality]}</span></td>
                    <td>₹{Number(t.price).toLocaleString("en-IN")}</td>
                    <td><span className={`crud-badge ${t.is_active ? "crud-badge--active" : "crud-badge--inactive"}`}>{t.is_active ? "Active" : "Inactive"}</span></td>
                    <td><div className="crud-actions">
                      <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openTypeEdit(t)}>Edit</button>
                      <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleTypeDelete(t)}>Delete</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── CREATE ORDER MODAL ── */}
      <Modal title="New diagnostic order" open={createOpen} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreateOrder}>
          <div className="crud-form-grid">
            <div className="crud-field crud-field--full">
              <label htmlFor="do_patient">Patient *</label>
              <select id="do_patient" value={orderForm.patient_id}
                onChange={(e) => setOrderForm((p) => ({ ...p, patient_id: e.target.value }))} required>
                <option value="">Select patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="do_type">Test type *</label>
              <select id="do_type" value={orderForm.test_type_id}
                onChange={(e) => setOrderForm((p) => ({ ...p, test_type_id: e.target.value }))} required>
                <option value="">Select test</option>
                {types.filter((t) => t.is_active).map((t) => (
                  <option key={t.id} value={t.id}>{MODALITY_LABELS[t.modality]} — {t.name} (₹{Number(t.price).toLocaleString("en-IN")})</option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="do_priority">Priority</label>
              <select id="do_priority" value={orderForm.priority}
                onChange={(e) => setOrderForm((p) => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="do_clinical">Clinical notes</label>
              <input id="do_clinical" value={orderForm.clinical_notes}
                onChange={(e) => setOrderForm((p) => ({ ...p, clinical_notes: e.target.value }))} />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="do_notes">Notes</label>
              <textarea id="do_notes" value={orderForm.notes}
                onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Creating…" : "Create order"}</button>
          </div>
        </form>
      </Modal>

      {/* ── SCHEDULE MODAL ── */}
      <Modal title={`Schedule — ${detailOrder?.order_number || ""}`} open={scheduleOpen} onClose={() => setScheduleOpen(false)}>
        <form onSubmit={handleSchedule}>
          <div className="crud-form-grid">
            <div className="crud-field crud-field--full">
              <label htmlFor="sch_at">Scheduled date & time *</label>
              <input id="sch_at" type="datetime-local" required value={scheduleForm.scheduled_at}
                onChange={(e) => setScheduleForm({ scheduled_at: e.target.value })} />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setScheduleOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : "Confirm schedule"}</button>
          </div>
        </form>
      </Modal>

      {/* ── REPORT MODAL ── */}
      <Modal title={`Enter report — ${detailOrder?.order_number || ""}`} open={reportOpen} onClose={() => setReportOpen(false)}>
        <form onSubmit={handleReport}>
          <div className="crud-form-grid">
            <div className="crud-field crud-field--full">
              <label htmlFor="rep_findings">Findings</label>
              <textarea id="rep_findings" rows={4} value={reportForm.findings}
                onChange={(e) => setReportForm((p) => ({ ...p, findings: e.target.value }))} placeholder="Describe what was observed…" />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="rep_impression">Impression / Diagnosis</label>
              <textarea id="rep_impression" rows={3} value={reportForm.impression}
                onChange={(e) => setReportForm((p) => ({ ...p, impression: e.target.value }))} />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="rep_reco">Recommendations</label>
              <textarea id="rep_reco" rows={2} value={reportForm.recommendations}
                onChange={(e) => setReportForm((p) => ({ ...p, recommendations: e.target.value }))} />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setReportOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : "Submit report"}</button>
          </div>
        </form>
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal title={`Order details — ${detailOrder?.order_number || ""}`} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detailOrder && (
          <div className="lab-detail">
            <dl className="lab-detail-grid">
              <div><dt>Patient</dt><dd>{detailOrder.patient?.name || "—"}</dd></div>
              <div><dt>Test</dt><dd>{detailOrder.test_type?.name || "—"}</dd></div>
              <div><dt>Modality</dt><dd>{MODALITY_LABELS[detailOrder.test_type?.modality] || "—"}</dd></div>
              <div><dt>Priority</dt><dd><span className={`dgn-priority dgn-priority-${detailOrder.priority}`}>{detailOrder.priority}</span></dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={detailOrder.status} /></dd></div>
              <div><dt>Scheduled</dt><dd>{formatDateTime(detailOrder.scheduled_at)}</dd></div>
              <div><dt>Amount</dt><dd>₹{Number(detailOrder.amount || 0).toLocaleString("en-IN")}</dd></div>
              <div><dt>Technician</dt><dd>{detailOrder.technician?.name || "—"}</dd></div>
            </dl>
            {detailOrder.clinical_notes && (
              <div className="lab-detail-notes"><strong>Clinical notes:</strong> {detailOrder.clinical_notes}</div>
            )}
            {detailOrder.report && (
              <>
                <h4 className="lab-detail-heading">Report</h4>
                {detailOrder.report.findings && <div className="dgn-report-block"><strong>Findings:</strong><p>{detailOrder.report.findings}</p></div>}
                {detailOrder.report.impression && <div className="dgn-report-block"><strong>Impression:</strong><p>{detailOrder.report.impression}</p></div>}
                {detailOrder.report.recommendations && <div className="dgn-report-block"><strong>Recommendations:</strong><p>{detailOrder.report.recommendations}</p></div>}
                {detailOrder.report.approved_at && <p className="dgn-approved">✓ Approved on {formatDate(detailOrder.report.approved_at)}</p>}
              </>
            )}
          </div>
        )}
        <div className="crud-modal-actions">
          <button type="button" className="crud-btn crud-btn--primary" onClick={() => setDetailOpen(false)}>Close</button>
        </div>
      </Modal>

      {/* ── TYPE MODAL ── */}
      <Modal title={editingType ? "Edit test type" : "Add test type"} open={typeModalOpen} onClose={() => setTypeModalOpen(false)}>
        <form onSubmit={handleTypeSave}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label htmlFor="tt_name">Name *</label>
              <input id="tt_name" name="name" value={typeForm.name}
                onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))} required placeholder="e.g. Chest X-Ray" />
            </div>
            <div className="crud-field">
              <label htmlFor="tt_code">Code</label>
              <input id="tt_code" value={typeForm.code}
                onChange={(e) => setTypeForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. XRAY-CHEST" />
            </div>
            <div className="crud-field">
              <label htmlFor="tt_modality">Modality *</label>
              <select id="tt_modality" value={typeForm.modality}
                onChange={(e) => setTypeForm((p) => ({ ...p, modality: e.target.value }))}>
                {MODALITIES.map((m) => <option key={m} value={m}>{MODALITY_LABELS[m]}</option>)}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="tt_price">Price (₹) *</label>
              <input id="tt_price" type="number" min="0" step="0.01" value={typeForm.price}
                onChange={(e) => setTypeForm((p) => ({ ...p, price: e.target.value }))} required />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="tt_prep">Preparation instructions</label>
              <textarea id="tt_prep" value={typeForm.preparation_instructions}
                onChange={(e) => setTypeForm((p) => ({ ...p, preparation_instructions: e.target.value }))} placeholder="e.g. Fast for 4 hours before the scan" />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="tt_desc">Description</label>
              <textarea id="tt_desc" value={typeForm.description}
                onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="crud-field">
              <label className="crud-checkbox"><input type="checkbox" checked={typeForm.is_active}
                onChange={(e) => setTypeForm((p) => ({ ...p, is_active: e.target.checked }))} /> Active</label>
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setTypeModalOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : editingType ? "Update" : "Create"}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default DiagnosticOrders;
