import { useCallback, useEffect, useState } from "react";
import {
  getLabOrders, createLabOrder, getLabOrder,
  collectLabSample, enterLabResults,
  verifyLabOrder, approveLabOrder, cancelLabOrder,
} from "../api/lab";
import { getLabCategories, getLabTests, getLabPackages } from "../api/lab";
import { getPatients } from "../api/patients";
import Modal from "../components/crud/Modal";
import { useAuth } from "../auth/AuthContext";
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
  const { isDoctor } = useAuth();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // For new order modal
  const [createOpen, setCreateOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [orderForm, setOrderForm] = useState({
    patient_id: "", collection_type: "walk_in", discount: "", notes: "", items: [],
  });
  const [saving, setSaving] = useState(false);

  // For detail/action modal
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

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
      });
      setOrders(data.data);
      setPagination(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load lab orders."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const loadCreateData = async () => {
    try {
      const [pRes, tRes, pkgRes] = await Promise.all([
        getPatients({ per_page: 500 }),
        getLabTests({ active_only: 1 }),
        getLabPackages({ active_only: 1 }),
      ]);
      setPatients(pRes.data.data || pRes.data);
      setTests(tRes.data);
      setPackages(pkgRes.data);
    } catch {
      // ignore
    }
  };

  const openCreate = async () => {
    setOrderForm({ patient_id: "", collection_type: "walk_in", discount: "", notes: "", items: [] });
    await loadCreateData();
    setCreateOpen(true);
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
      await createLabOrder(orderForm);
      setCreateOpen(false);
      await load();
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
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From" />
          <span>–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To" />
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
            <div className="crud-field crud-field--full">
              <label htmlFor="lo_patient">Patient *</label>
              <select id="lo_patient" name="patient_id" value={orderForm.patient_id}
                onChange={(e) => setOrderForm((p) => ({ ...p, patient_id: e.target.value }))} required>
                <option value="">Select patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone || p.email || ""}</option>)}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="lo_collection">Collection type</label>
              <select id="lo_collection" value={orderForm.collection_type}
                onChange={(e) => setOrderForm((p) => ({ ...p, collection_type: e.target.value }))}>
                <option value="walk_in">Walk-in</option>
                <option value="home">Home collection</option>
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="lo_discount">Discount (₹)</label>
              <input id="lo_discount" type="number" min="0" value={orderForm.discount}
                onChange={(e) => setOrderForm((p) => ({ ...p, discount: e.target.value }))} />
            </div>
            <div className="crud-field crud-field--full">
              <label>Select tests</label>
              <div className="lab-order-selector">
                <p className="lab-selector-label">Individual tests</p>
                {tests.map((t) => (
                  <label key={t.id} className={`lab-selector-item ${isItemSelected("test", t) ? "is-selected" : ""}`}>
                    <input type="checkbox" checked={isItemSelected("test", t)} onChange={() => toggleItem("test", t)} />
                    <span>{t.name}</span>
                    <span className="lab-selector-price">₹{Number(t.price).toLocaleString("en-IN")}</span>
                  </label>
                ))}
                {packages.length > 0 && <>
                  <p className="lab-selector-label">Packages</p>
                  {packages.map((pk) => (
                    <label key={pk.id} className={`lab-selector-item ${isItemSelected("package", pk) ? "is-selected" : ""}`}>
                      <input type="checkbox" checked={isItemSelected("package", pk)} onChange={() => toggleItem("package", pk)} />
                      <span>{pk.name}</span>
                      <span className="lab-selector-price">₹{Number(pk.price).toLocaleString("en-IN")}</span>
                    </label>
                  ))}
                </>}
              </div>
            </div>
            {orderForm.items.length > 0 && (
              <div className="crud-field crud-field--full">
                <div className="lab-order-total">
                  Gross: ₹{selectedTotal.toLocaleString("en-IN")} —
                  Net: ₹{Math.max(0, selectedTotal - (Number(orderForm.discount) || 0)).toLocaleString("en-IN")}
                </div>
              </div>
            )}
            <div className="crud-field crud-field--full">
              <label htmlFor="lo_notes">Notes</label>
              <textarea id="lo_notes" value={orderForm.notes}
                onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Creating…" : "Create order"}
            </button>
          </div>
        </form>
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
                onChange={(e) => setCollectForm((p) => ({ ...p, notes: e.target.value }))} />
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
