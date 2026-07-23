import { useCallback, useEffect, useState } from "react";
import "../App.css";
import { getAppointments } from "../api/appointments";
import {
  createBilling,
  deleteBilling,
  getBillings,
  updateBilling,
} from "../api/billings";
import { getPatients } from "../api/patients";
import { formatCurrency } from "../config/currency";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Billing.css";

const STATUSES = ["pending", "paid", "overdue", "cancelled"];
const PAYMENT_METHODS = ["", "cash", "card", "bank_transfer", "insurance"];

const emptyForm = {
  patient_id: "",
  appointment_id: "",
  invoice_number: "",
  amount: "",
  status: "pending",
  payment_method: "",
  billed_at: "",
  paid_at: "",
  notes: "",
};

function Billing() {
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [billRes, patientRes, apptRes] = await Promise.all([
        getBillings(),
        getPatients(),
        getAppointments(),
      ]);
      setItems(billRes.data);
      setPatients(patientRes.data);
      setAppointments(apptRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load billing records."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, billed_at: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      patient_id: String(row.patient_id),
      appointment_id: row.appointment_id ? String(row.appointment_id) : "",
      invoice_number: row.invoice_number || "",
      amount: row.amount ?? "",
      status: row.status || "pending",
      payment_method: row.payment_method || "",
      billed_at: row.billed_at?.slice(0, 10) || "",
      paid_at: row.paid_at?.slice(0, 10) || "",
      notes: row.notes || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildPayload = () => {
    const payload = {
      patient_id: Number(form.patient_id),
      appointment_id: form.appointment_id ? Number(form.appointment_id) : null,
      amount: Number(form.amount),
      status: form.status,
      payment_method: form.payment_method || null,
      billed_at: form.billed_at,
      paid_at: form.paid_at || null,
      notes: form.notes || null,
    };
    if (form.invoice_number) payload.invoice_number = form.invoice_number;
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      if (editing) {
        await updateBilling(editing.id, payload);
      } else {
        await createBilling(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save billing record."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete invoice "${row.invoice_number}"?`)) return;
    setError("");
    try {
      await deleteBilling(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete billing record."));
    }
  };

  const filteredAppointments = form.patient_id
    ? appointments.filter((a) => String(a.patient_id) === form.patient_id)
    : appointments;

  return (
    <section className="page-card billing-page">
      <div className="page-card-header">
        <h2>Billing</h2>
        <p>Manage invoices and payment records for patients.</p>
      </div>

      <div className="crud-toolbar">
        <span>{loading ? "Loading…" : `${items.length} invoice(s)`}</span>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          Add invoice
        </button>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Patient</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Billed</th>
              <th>Paid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="crud-empty">
                  No invoices yet. Click &quot;Add invoice&quot; to create one.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td>{row.invoice_number}</td>
                <td>{row.patient?.name || "—"}</td>
                <td>{formatCurrency(row.amount, { decimals: 2 })}</td>
                <td>
                  <span
                    className={`crud-badge ${
                      row.status === "paid" ? "crud-badge--active" : "crud-badge--inactive"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td>{row.billed_at?.slice(0, 10) || "—"}</td>
                <td>{row.paid_at?.slice(0, 10) || "—"}</td>
                <td>
                  <div className="crud-actions">
                    <button
                      type="button"
                      className="crud-btn crud-btn--ghost crud-btn--sm"
                      onClick={() => openEdit(row)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="crud-btn crud-btn--danger crud-btn--sm"
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

      <Modal
        title={editing ? "Edit invoice" : "Add invoice"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label htmlFor="patient_id">Patient</label>
              <select
                id="patient_id"
                name="patient_id"
                value={form.patient_id}
                onChange={handleChange}
                required
              >
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.patient_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="appointment_id">Appointment (optional)</label>
              <select
                id="appointment_id"
                name="appointment_id"
                value={form.appointment_id}
                onChange={handleChange}
              >
                <option value="">None</option>
                {filteredAppointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} — {new Date(a.appointment_date).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="invoice_number">
                Invoice number{editing ? "" : " (auto if empty)"}
              </label>
              <input
                id="invoice_number"
                name="invoice_number"
                value={form.invoice_number}
                onChange={handleChange}
                required={Boolean(editing)}
                placeholder="Auto if empty"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="amount">Amount</label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={handleChange}
                required
                placeholder="0.00"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="payment_method">Payment method</label>
              <select
                id="payment_method"
                name="payment_method"
                value={form.payment_method}
                onChange={handleChange}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m || "none"} value={m}>
                    {m ? m.replace("_", " ") : "—"}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="billed_at">Billed date</label>
              <input
                id="billed_at"
                name="billed_at"
                type="date"
                value={form.billed_at}
                onChange={handleChange}
                required
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="paid_at">Paid date</label>
              <input
                id="paid_at"
                name="paid_at"
                type="date"
                value={form.paid_at}
                onChange={handleChange}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Enter notes…" />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default Billing;
