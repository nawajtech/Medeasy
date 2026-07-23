import { useCallback, useEffect, useState } from "react";
import {
  getLabOrders, createLabOrder, getLabOrder,
  collectLabSample, enterLabResults,
  verifyLabOrder, approveLabOrder, cancelLabOrder,
} from "../api/lab";
import { getLabTests, getLabPackages } from "../api/lab";
import { getPatients } from "../api/patients";
import Modal from "../components/crud/Modal";
import BranchSelect from "../components/BranchSelect";
import CompanySelect from "../components/CompanySelect";
import { useAuth } from "../auth/AuthContext";
import AuditTimeline from "../components/audit/AuditTimeline";
import { hasPermission } from "../config/permissions";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./LabOrders.css";

const STATUS_META = {
  pending:    { label: "Pending",    color: "is-pending" },
  collected:  { label: "Collected",  color: "is-collected" },
  processing: { label: "Processing", color: "is-processing" },
  resulted:   { label: "Resulted",   color: "is-resulted" },
  verified:   { label: "Verified",   color: "is-verified" },
  approved:   { label: "Approved",   color: "is-approved" },
  cancelled:  { label: "Cancelled",  color: "is-cancelled" },
};

const SAMPLE_TYPES = ["blood", "urine", "stool", "swab", "sputum", "other"];

const FLAG_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High (H)" },
  { value: "low", label: "Low (L)" },
  { value: "critical", label: "Critical" },
];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: "" };
  return <span className={`lab-order-status ${meta.color}`}>{meta.label}</span>;
}

function LabOrders() {
  const { isDoctor, isSuperAdmin, user } = useAuth();
  const canViewAudit = hasPermission(user?.permissions, "audit.view");
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  // For new order modal
  const [createOpen, setCreateOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [orderForm, setOrderForm] = useState({
    company_id: "", patient_id: "", branch_id: "", collection_type: "walk_in", discount: "", notes: "", items: [],
  });
  const [saving, setSaving] = useState(false);

  // For detail/action modal
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Bill modal shown after order creation
  const [billOrder, setBillOrder] = useState(null);
  const [billOpen, setBillOpen] = useState(false);

  // Collect sample form
  const [collectForm, setCollectForm] = useState({ sample_type: "blood", notes: "" });
  const [collectOpen, setCollectOpen] = useState(false);

  // Results form
  const [resultsForm, setResultsForm] = useState([]);
  const [resultsOpen, setResultsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getLabOrders({
        status: statusFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        branch_id: branchFilter || undefined,
      });
      setOrders(data.data);
      setPagination(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load lab orders."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, branchFilter]);

  useEffect(() => { load(); }, [load]);

  const loadCreateData = async (companyId = "") => {
    const params = companyId ? { company_id: companyId } : {};
    const [pRes, tRes, pkgRes] = await Promise.allSettled([
      getPatients({ per_page: 500, ...params }),
      getLabTests({ active_only: 1, ...params }),
      getLabPackages({ active_only: 1, ...params }),
    ]);
    if (pRes.status === "fulfilled") setPatients(pRes.value.data.data || pRes.value.data);
    if (tRes.status === "fulfilled") setTests(tRes.value.data);
    if (pkgRes.status === "fulfilled") setPackages(pkgRes.value.data);
  };

  const openCreate = async () => {
    setPatients([]); setTests([]); setPackages([]);
    setOrderForm({ company_id: "", patient_id: "", branch_id: "", collection_type: "walk_in", discount: "", notes: "", items: [] });
    setCreateOpen(true);
    await loadCreateData("");
  };

  const handleOrderCompanyChange = async (e) => {
    const cid = e.target.value;
    setOrderForm((p) => ({ ...p, company_id: cid, patient_id: "", branch_id: "", items: [] }));
    setPatients([]); setTests([]); setPackages([]);
    await loadCreateData(cid);
  };

  const toggleItem = (type, item) => {
    setOrderForm((prev) => {
      const key = type === "test" ? "test_id" : "package_id";
      const exists = prev.items.some((i) => i[key] === item.id);
      return {
        ...prev,
        items: exists
          ? prev.items.filter((i) => i[key] !== item.id)
          : [...prev.items, { [key]: item.id }],
      };
    });
  };

  const isItemSelected = (type, item) => {
    const key = type === "test" ? "test_id" : "package_id";
    return orderForm.items.some((i) => i[key] === item.id);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!orderForm.items.length) { setError("Select at least one test or package."); return; }
    setSaving(true);
    setError("");
    try {
      const { data: newOrder } = await createLabOrder(orderForm);
      setCreateOpen(false);
      await load();
      // Show bill immediately after creation
      setBillOrder({
        ...newOrder,
        _items: orderForm.items.map((item) => {
          if (item.test_id) {
            const t = tests.find((x) => x.id === item.test_id);
            return { label: t?.name || "Test", price: Number(t?.price || 0), type: "test" };
          }
          const p = packages.find((x) => x.id === item.package_id);
          return { label: p?.name || "Package", price: Number(p?.price || 0), type: "package" };
        }),
        _gross: selectedTotal,
        _discount: Number(orderForm.discount) || 0,
        _net: Math.max(0, selectedTotal - (Number(orderForm.discount) || 0)),
      });
      setBillOpen(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create order."));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (order) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const { data } = await getLabOrder(order.id);
      setDetailOrder(data);
    } catch {
      setDetailOrder(order);
    } finally {
      setDetailLoading(false);
    }
  };

  const openCollect = (order) => {
    setDetailOrder(order);
    setCollectForm({ sample_type: "blood", notes: "" });
    setCollectOpen(true);
  };

  const handleCollect = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await collectLabSample(detailOrder.id, collectForm);
      setCollectOpen(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to collect sample."));
    } finally {
      setSaving(false);
    }
  };

  const openResults = async (order) => {
    setDetailLoading(true);
    try {
      const { data } = await getLabOrder(order.id);
      setDetailOrder(data);
      // Build results form: one entry per order item that maps to a single test
      const rows = [];
      for (const item of data.items || []) {
        if (item.test) {
          rows.push({
            order_item_id: item.id,
            test_id: item.test.id,
            test_name: item.test.name,
            unit: item.test.unit || "",
            ref_range: item.test.ref_range_male || "",
            value: item.result?.value || "",
            flag: item.result?.flag || "normal",
            notes: item.result?.notes || "",
          });
        } else if (item.package) {
          for (const t of item.package.tests || []) {
            rows.push({
              order_item_id: item.id,
              test_id: t.id,
              test_name: t.name,
              unit: t.unit || "",
              ref_range: t.ref_range_male || "",
              value: "",
              flag: "normal",
              notes: "",
            });
          }
        }
      }
      setResultsForm(rows);
    } catch {
      // fallback
    } finally {
      setDetailLoading(false);
    }
    setResultsOpen(true);
  };

  const handleResultChange = (index, field, value) => {
    setResultsForm((prev) => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleResultsSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await enterLabResults(detailOrder.id, { results: resultsForm });
      setResultsOpen(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save results."));
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (order) => {
    if (!window.confirm("Mark this order as verified?")) return;
    try {
      await verifyLabOrder(order.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to verify."));
    }
  };

  const handleApprove = async (order) => {
    if (!window.confirm("Approve and finalize this lab report?")) return;
    try {
      await approveLabOrder(order.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to approve."));
    }
  };

  const handleCancel = async (order) => {
    if (!window.confirm(`Cancel order ${order.order_number}?`)) return;
    try {
      await cancelLabOrder(order.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to cancel."));
    }
  };

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-IN") : "—";
  const formatMoney = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

  // Estimated total from selected items
  const selectedTotal = orderForm.items.reduce((sum, item) => {
    if (item.test_id) {
      const t = tests.find((x) => x.id === item.test_id);
      return sum + (t ? Number(t.price) : 0);
    }
    if (item.package_id) {
      const p = packages.find((x) => x.id === item.package_id);
      return sum + (p ? Number(p.price) : 0);
    }
    return sum;
  }, 0);

  return (
    <section className="page-card lab-orders-page">
      <div className="page-card-header">
        <h2>Lab Orders</h2>
        <p>Manage lab orders — from sample collection to report approval.</p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      {/* Filters */}
      <div className="crud-toolbar lab-orders-toolbar">
        <div className="lab-orders-filters">
          <select
            className="crud-btn crud-btn--ghost"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([v, m]) => (
              <option key={v} value={v}>{m.label}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From" placeholder="From date" />
          <span>–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To" placeholder="To date" />
          <BranchSelect
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            allLabel="All branches"
            id="lab_branch_filter"
            name="lab_branch_filter"
          />
        </div>
        {!isDoctor && (
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
            New order
          </button>
        )}
      </div>

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Patient</th>
              <th>Branch</th>
              <th>Tests</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && orders.length === 0 && (
              <tr><td colSpan={7} className="crud-empty">No lab orders found.</td></tr>
            )}
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong className="lab-order-num">{order.order_number}</strong></td>
                <td>{order.patient?.name || "—"}</td>
                <td>
                  {order.branch
                    ? <span className="branch-pill">{order.branch.name}</span>
                    : <span style={{ color: "var(--me-text-muted)" }}>—</span>}
                </td>
                <td className="lab-order-tests">
                  {order.items?.slice(0, 2).map((item) => (
                    <span key={item.id} className="lab-item-chip">
                      {item.test?.name || item.package?.name || "—"}
                    </span>
                  ))}
                  {order.items?.length > 2 && <span className="lab-item-more">+{order.items.length - 2} more</span>}
                </td>
                <td>{formatMoney(order.net_amount)}</td>
                <td><StatusBadge status={order.status} /></td>
                <td>{formatDate(order.ordered_at)}</td>
                <td>
                  <div className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openDetail(order)}>View</button>
                    {order.status === "pending" && (
                      <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openCollect(order)}>Collect</button>
                    )}
                    {["collected", "processing"].includes(order.status) && (
                      <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => openResults(order)}>Enter results</button>
                    )}
                    {order.status === "resulted" && (
                      <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => handleVerify(order)}>Verify</button>
                    )}
                    {order.status === "verified" && (
                      <button type="button" className="crud-btn crud-btn--primary crud-btn--sm" onClick={() => handleApprove(order)}>Approve</button>
                    )}
                    {!["approved", "cancelled"].includes(order.status) && (
                      <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleCancel(order)}>Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── CREATE ORDER MODAL ── */}
      <Modal title="New lab order" open={createOpen} onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleCreateSubmit}>
          <div className="crud-form-grid">
            {/* Company (super admin only — must pick company first to load its patients & tests) */}
            {isSuperAdmin && (
              <CompanySelect
                id="lo_company"
                label="Company *"
                value={orderForm.company_id}
                onChange={handleOrderCompanyChange}
                required
              />
            )}
            {/* Row 1: Patient */}
            <div className="crud-field crud-field--full">
              <label htmlFor="lo_patient">Patient <span className="req">*</span></label>
              <select id="lo_patient" value={orderForm.patient_id}
                onChange={(e) => setOrderForm((p) => ({ ...p, patient_id: e.target.value }))} required>
                <option value="">Select patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` — ${p.phone}` : ""}</option>)}
              </select>
            </div>
            {/* Row 2: Branch + Collection */}
            <div className="crud-field">
              <label>Branch</label>
              <BranchSelect id="lo_branch" name="branch_id" value={orderForm.branch_id}
                onChange={(e) => setOrderForm((p) => ({ ...p, branch_id: e.target.value }))}
                allLabel="Any branch" />
            </div>
            <div className="crud-field">
              <label htmlFor="lo_collection">Collection type</label>
              <select id="lo_collection" value={orderForm.collection_type}
                onChange={(e) => setOrderForm((p) => ({ ...p, collection_type: e.target.value }))}>
                <option value="walk_in">Walk-in</option>
                <option value="home">Home collection</option>
              </select>
            </div>

            {/* ── Test selector ── */}
            <div className="crud-field crud-field--full">
              <label>Select tests &amp; packages <span className="req">*</span></label>
              {tests.length === 0 && packages.length === 0 ? (
                <div className="lo-empty-tests">
                  <p>No active tests found.</p>
                  <p>Go to <strong>Lab Catalog</strong> and add test categories &amp; tests first, then come back to create an order.</p>
                </div>
              ) : (
                <div className="lab-order-selector">
                  {/* Tests grouped by category */}
                  {(() => {
                    const byCategory = {};
                    tests.forEach((t) => {
                      const cat = t.category?.name || "Uncategorised";
                      if (!byCategory[cat]) byCategory[cat] = [];
                      byCategory[cat].push(t);
                    });
                    return Object.entries(byCategory).map(([cat, catTests]) => (
                      <div key={cat}>
                        <p className="lab-selector-label">📂 {cat}</p>
                        {catTests.map((t) => (
                          <label key={t.id} className={`lab-selector-item ${isItemSelected("test", t) ? "is-selected" : ""}`}>
                            <input type="checkbox" checked={isItemSelected("test", t)} onChange={() => toggleItem("test", t)} />
                            <span className="lab-selector-name">{t.name}
                              {t.code && <span className="lab-selector-code"> ({t.code})</span>}
                            </span>
                            <span className="lab-selector-meta">
                              <span className={`lab-sample-badge lab-sample-${t.sample_type}`}>{t.sample_type}</span>
                              <span className="lab-selector-price">₹{Number(t.price).toLocaleString("en-IN")}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    ));
                  })()}
                  {/* Packages */}
                  {packages.length > 0 && (
                    <div>
                      <p className="lab-selector-label">📦 Packages</p>
                      {packages.map((pk) => (
                        <label key={pk.id} className={`lab-selector-item ${isItemSelected("package", pk) ? "is-selected" : ""}`}>
                          <input type="checkbox" checked={isItemSelected("package", pk)} onChange={() => toggleItem("package", pk)} />
                          <span className="lab-selector-name">{pk.name}
                            {pk.tests?.length > 0 && <span className="lab-selector-code"> ({pk.tests.length} tests)</span>}
                          </span>
                          <span className="lab-selector-meta">
                            <span className="lab-selector-price">₹{Number(pk.price).toLocaleString("en-IN")}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Bill summary ── */}
            {orderForm.items.length > 0 && (
              <div className="crud-field crud-field--full">
                <div className="lo-bill-panel">
                  <div className="lo-bill-title">Bill Summary</div>
                  <div className="lo-bill-items">
                    {orderForm.items.map((item, i) => {
                      const isTest = !!item.test_id;
                      const rec = isTest
                        ? tests.find((x) => x.id === item.test_id)
                        : packages.find((x) => x.id === item.package_id);
                      return (
                        <div key={i} className="lo-bill-row">
                          <span>{rec?.name || (isTest ? "Test" : "Package")}</span>
                          <span>₹{Number(rec?.price || 0).toLocaleString("en-IN")}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="lo-bill-divider" />
                  <div className="lo-bill-row lo-bill-subtotal">
                    <span>Gross total</span>
                    <span>₹{selectedTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="lo-bill-row lo-bill-discount-row">
                    <label htmlFor="lo_discount">Discount (₹)</label>
                    <input id="lo_discount" type="number" min="0" max={selectedTotal}
                      value={orderForm.discount}
                      onChange={(e) => setOrderForm((p) => ({ ...p, discount: e.target.value }))}
                      className="lo-discount-input" placeholder="0" />
                  </div>
                  <div className="lo-bill-divider" />
                  <div className="lo-bill-row lo-bill-net">
                    <span>Net payable</span>
                    <span>₹{Math.max(0, selectedTotal - (Number(orderForm.discount) || 0)).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="crud-field crud-field--full">
              <label htmlFor="lo_notes">Notes</label>
              <textarea id="lo_notes" rows={2} value={orderForm.notes}
                onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any special instructions…" />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving || (!orderForm.items.length)}>
              {saving ? "Creating…" : `Create order${orderForm.items.length ? ` & bill` : ""}`}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── BILL MODAL (shown right after order creation) ── */}
      <Modal title="Order Created — Bill" open={billOpen} onClose={() => setBillOpen(false)}>
        {billOrder && (
          <div className="lo-bill-receipt">
            <div className="lo-receipt-header">
              <span className="lo-receipt-icon">🧾</span>
              <div>
                <div className="lo-receipt-order">{billOrder.order_number}</div>
                <div className="lo-receipt-status">Order placed — <strong>Pending sample collection</strong></div>
              </div>
            </div>
            <div className="lo-bill-items" style={{ marginTop: 16 }}>
              {billOrder._items?.map((item, i) => (
                <div key={i} className="lo-bill-row">
                  <span>
                    <span className={`lo-item-type-dot lo-dot-${item.type}`} />
                    {item.label}
                  </span>
                  <span>₹{item.price.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
            <div className="lo-bill-divider" />
            <div className="lo-bill-row lo-bill-subtotal">
              <span>Gross total</span>
              <span>₹{billOrder._gross?.toLocaleString("en-IN")}</span>
            </div>
            {billOrder._discount > 0 && (
              <div className="lo-bill-row" style={{ color: "var(--me-success)" }}>
                <span>Discount</span>
                <span>−₹{billOrder._discount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="lo-bill-divider" />
            <div className="lo-bill-row lo-bill-net">
              <span>Net payable</span>
              <span>₹{billOrder._net?.toLocaleString("en-IN")}</span>
            </div>
            <div className="lo-receipt-note">
              Next step: collect the patient&apos;s sample to proceed.
            </div>
            <div className="crud-modal-actions">
              <button type="button" className="crud-btn crud-btn--primary" onClick={() => setBillOpen(false)}>Done</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── COLLECT SAMPLE MODAL ── */}
      <Modal title={`Collect sample — ${detailOrder?.order_number || ""}`} open={collectOpen} onClose={() => setCollectOpen(false)}>
        <form onSubmit={handleCollect}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label htmlFor="col_type">Sample type *</label>
              <select id="col_type" value={collectForm.sample_type}
                onChange={(e) => setCollectForm((p) => ({ ...p, sample_type: e.target.value }))}>
                {SAMPLE_TYPES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="col_notes">Notes</label>
              <input id="col_notes" value={collectForm.notes}
                onChange={(e) => setCollectForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Collection notes" />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setCollectOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Collecting…" : "Mark collected"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── ENTER RESULTS MODAL ── */}
      <Modal title={`Enter results — ${detailOrder?.order_number || ""}`} open={resultsOpen} onClose={() => setResultsOpen(false)}>
        <form onSubmit={handleResultsSubmit}>
          {detailLoading ? <p>Loading…</p> : (
            <div className="lab-results-grid">
              {resultsForm.map((row, index) => (
                <div key={index} className="lab-result-row">
                  <div className="lab-result-name">{row.test_name}</div>
                  <div className="lab-result-fields">
                    <div className="crud-field">
                      <label>Value</label>
                      <input value={row.value} onChange={(e) => handleResultChange(index, "value", e.target.value)} placeholder="e.g. 5.2" />
                    </div>
                    <div className="crud-field">
                      <label>Unit</label>
                      <input value={row.unit} onChange={(e) => handleResultChange(index, "unit", e.target.value)} placeholder="e.g. g/dL" />
                    </div>
                    <div className="crud-field">
                      <label>Ref range</label>
                      <input value={row.ref_range} onChange={(e) => handleResultChange(index, "ref_range", e.target.value)} placeholder="e.g. 4.5-5.9" />
                    </div>
                    <div className="crud-field">
                      <label>Flag</label>
                      <select value={row.flag} onChange={(e) => handleResultChange(index, "flag", e.target.value)}>
                        {FLAG_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setResultsOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save results"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DETAIL MODAL ── */}
      <Modal title={`Order details — ${detailOrder?.order_number || ""}`} open={detailOpen} onClose={() => setDetailOpen(false)}>
        {detailLoading ? <p>Loading…</p> : detailOrder && (
          <div className="lab-detail">
            <dl className="lab-detail-grid">
              <div><dt>Patient</dt><dd>{detailOrder.patient?.name || "—"}</dd></div>
              <div><dt>Doctor</dt><dd>{detailOrder.doctor?.user?.name || "—"}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={detailOrder.status} /></dd></div>
              <div><dt>Collection</dt><dd>{detailOrder.collection_type?.replace("_", " ")}</dd></div>
              <div><dt>Amount</dt><dd>₹{Number(detailOrder.net_amount || 0).toLocaleString("en-IN")}</dd></div>
              <div><dt>Ordered</dt><dd>{formatDate(detailOrder.ordered_at)}</dd></div>
            </dl>
            <h4 className="lab-detail-heading">Tests / Packages</h4>
            <ul className="lab-detail-items">
              {detailOrder.items?.map((item) => (
                <li key={item.id}>
                  {item.test?.name || item.package?.name || "—"}
                  <span className="lab-detail-price">₹{Number(item.price).toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
            {detailOrder.samples?.length > 0 && (
              <>
                <h4 className="lab-detail-heading">Sample</h4>
                <dl className="lab-detail-grid">
                  <div><dt>Sample ID</dt><dd>{detailOrder.samples[0].sample_id}</dd></div>
                  <div><dt>Type</dt><dd>{detailOrder.samples[0].sample_type}</dd></div>
                  <div><dt>Collected at</dt><dd>{formatDate(detailOrder.samples[0].collected_at)}</dd></div>
                </dl>
              </>
            )}
            {detailOrder.results?.length > 0 && (
              <>
                <h4 className="lab-detail-heading">Results</h4>
                <table className="crud-table lab-results-table">
                  <thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Ref</th><th>Flag</th></tr></thead>
                  <tbody>
                    {detailOrder.results.map((r) => (
                      <tr key={r.id}>
                        <td>{r.test?.name || "—"}</td>
                        <td><strong>{r.value || "—"}</strong></td>
                        <td>{r.unit || "—"}</td>
                        <td>{r.ref_range || "—"}</td>
                        <td><span className={`lab-flag lab-flag-${r.flag}`}>{r.flag || "—"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {canViewAudit && detailOrder?.id && (
              <>
                <h4 className="lab-detail-heading">Activity log</h4>
                <AuditTimeline labOrderId={detailOrder.id} compact />
              </>
            )}
          </div>
        )}
        <div className="crud-modal-actions">
          <button type="button" className="crud-btn crud-btn--primary" onClick={() => setDetailOpen(false)}>Close</button>
        </div>
      </Modal>
    </section>
  );
}

export default LabOrders;
