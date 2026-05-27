import { useCallback, useEffect, useState } from "react";
import "../App.css";
import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  getAppointmentVitals,
  openPrescription,
  saveAppointmentVitals,
  updateAppointment,
} from "../api/appointments";
import { getPatientBalance, openBillingInvoice } from "../api/billings";
import { checkDoctorAvailability } from "../api/doctorAvailabilities";
import { getDoctors } from "../api/doctors";
import { getPatients } from "../api/patients";
import { useAuth } from "../auth/AuthContext";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Appointments.css";

const STATUSES = ["scheduled", "confirmed", "completed", "cancelled"];

const emptyVitalsForm = {
  blood_pressure: "",
  heart_rate: "",
  body_temperature: "",
  oxygen_saturation: "",
  respiratory_rate: "",
  blood_sugar: "",
};

const emptyForm = {
  patient_id: "",
  doctor_id: "",
  appointment_date: "",
  duration_minutes: "30",
  status: "scheduled",
  reason: "",
  notes: "",
  prescription: "",
  previous_due: "0",
  charge_amount: "",
  paid_amount: "0",
  payment_method: "",
  billed_at: "",
};

function toLocalDatetime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function calcTotals(previousDue, charge, paid) {
  const prev = Number(previousDue) || 0;
  const ch = Number(charge) || 0;
  const pd = Number(paid) || 0;
  const total = prev + ch;
  const balanceDue = Math.max(0, total - pd);
  return { total, balanceDue };
}

function Appointments() {
  const { isSuperAdmin, isDoctor, user } = useAuth();
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [vitalsAppointment, setVitalsAppointment] = useState(null);
  const [vitalsForm, setVitalsForm] = useState(emptyVitalsForm);
  const [vitalsSaving, setVitalsSaving] = useState(false);
  const [vitalsError, setVitalsError] = useState("");
  const [availabilityMsg, setAvailabilityMsg] = useState("");
  const [availabilityOk, setAvailabilityOk] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (isSuperAdmin && filterCompanyId) params.company_id = filterCompanyId;
      const [apptRes, patientRes, doctorRes] = await Promise.all([
        getAppointments(params),
        getPatients(params),
        getDoctors(params),
      ]);
      setItems(apptRes.data);
      setPatients(patientRes.data);
      setDoctors(doctorRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load appointments."));
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, filterCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  const fetchPatientBalance = async (patientId) => {
    if (!patientId) return;
    setLoadingBalance(true);
    try {
      const { data } = await getPatientBalance(patientId);
      setForm((prev) => ({
        ...prev,
        previous_due: String(data.previous_due ?? 0),
      }));
    } catch {
      setForm((prev) => ({ ...prev, previous_due: "0" }));
    } finally {
      setLoadingBalance(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      billed_at: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    const b = row.billing || {};
    setEditing(row);
    setForm({
      patient_id: String(row.patient_id),
      doctor_id: String(row.doctor_id),
      appointment_date: toLocalDatetime(row.appointment_date),
      duration_minutes: String(row.duration_minutes ?? 30),
      status: row.status || "scheduled",
      reason: row.reason || "",
      notes: row.notes || "",
      prescription: row.prescription || "",
      previous_due: String(b.previous_due ?? 0),
      charge_amount: b.charge_amount ?? "",
      paid_amount: String(b.paid_amount ?? 0),
      payment_method: b.payment_method || "",
      billed_at: b.billed_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
    if (row.doctor_id && row.appointment_date) {
      runAvailabilityCheck(
        String(row.doctor_id),
        toLocalDatetime(row.appointment_date),
        String(row.duration_minutes ?? 30),
        row.id
      );
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setAvailabilityMsg("");
    setAvailabilityOk(null);
  };

  const runAvailabilityCheck = async (doctorId, dateValue, duration, excludeId) => {
    if (!doctorId || !dateValue) {
      setAvailabilityMsg("");
      setAvailabilityOk(null);
      return;
    }
    setCheckingAvailability(true);
    try {
      const { data } = await checkDoctorAvailability(doctorId, {
        appointment_date: new Date(dateValue).toISOString(),
        duration_minutes: Number(duration) || 30,
        exclude_appointment_id: excludeId || undefined,
      });
      setAvailabilityOk(data.available);
      setAvailabilityMsg(data.message);
      if (data.available?.slot_duration && !editing) {
        setForm((prev) => ({
          ...prev,
          duration_minutes: String(
            Math.min(Number(prev.duration_minutes) || 30, data.availability.slot_duration)
          ),
        }));
      }
    } catch {
      setAvailabilityOk(false);
      setAvailabilityMsg("Could not verify doctor availability.");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "doctor_id" && value) {
        const doc = doctors.find((d) => String(d.id) === value);
        if (doc?.consultation_fee != null) {
          next.charge_amount = String(doc.consultation_fee);
        }
      }
      return next;
    });

    if (name === "patient_id" && value && !editing) {
      fetchPatientBalance(value);
    }

    if (["doctor_id", "appointment_date", "duration_minutes"].includes(name)) {
      const nextDoctor = name === "doctor_id" ? value : form.doctor_id;
      const nextDate = name === "appointment_date" ? value : form.appointment_date;
      const nextDuration = name === "duration_minutes" ? value : form.duration_minutes;
      runAvailabilityCheck(
        nextDoctor,
        nextDate,
        nextDuration,
        editing?.id
      );
    }
  };

  const buildPayload = () => ({
    patient_id: Number(form.patient_id),
    doctor_id: Number(form.doctor_id),
    duration_minutes: Number(form.duration_minutes) || 30,
    appointment_date: new Date(form.appointment_date).toISOString(),
    status: form.status,
    reason: form.reason || null,
    notes: form.notes || null,
    prescription: form.prescription || null,
    previous_due: Number(form.previous_due) || 0,
    charge_amount: Number(form.charge_amount) || 0,
    paid_amount: Number(form.paid_amount) || 0,
    payment_method: form.payment_method || null,
    billed_at: form.billed_at || new Date().toISOString().slice(0, 10),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (availabilityOk === false) {
      setError(availabilityMsg || "Doctor is not available at this time.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      if (editing) {
        await updateAppointment(editing.id, payload);
      } else {
        await createAppointment(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save appointment."));
    } finally {
      setSaving(false);
    }
  };

  const openVitals = async (row) => {
    setVitalsAppointment(row);
    setVitalsError("");
    setVitalsForm(emptyVitalsForm);
    setVitalsOpen(true);

    try {
      const { data } = await getAppointmentVitals(row.id);
      if (data) {
        setVitalsForm({
          blood_pressure: data.blood_pressure || "",
          heart_rate: data.heart_rate ?? "",
          body_temperature: data.body_temperature ?? "",
          oxygen_saturation: data.oxygen_saturation ?? "",
          respiratory_rate: data.respiratory_rate ?? "",
          blood_sugar: data.blood_sugar ?? "",
        });
      }
    } catch {
      if (row.vitals) {
        setVitalsForm({
          blood_pressure: row.vitals.blood_pressure || "",
          heart_rate: row.vitals.heart_rate ?? "",
          body_temperature: row.vitals.body_temperature ?? "",
          oxygen_saturation: row.vitals.oxygen_saturation ?? "",
          respiratory_rate: row.vitals.respiratory_rate ?? "",
          blood_sugar: row.vitals.blood_sugar ?? "",
        });
      }
    }
  };

  const closeVitals = () => {
    setVitalsOpen(false);
    setVitalsAppointment(null);
    setVitalsForm(emptyVitalsForm);
    setVitalsError("");
  };

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitalsForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildVitalsPayload = () => {
    const payload = {};
    if (vitalsForm.blood_pressure?.trim()) {
      payload.blood_pressure = vitalsForm.blood_pressure.trim();
    }
    if (vitalsForm.heart_rate !== "") payload.heart_rate = Number(vitalsForm.heart_rate);
    if (vitalsForm.body_temperature !== "") {
      payload.body_temperature = Number(vitalsForm.body_temperature);
    }
    if (vitalsForm.oxygen_saturation !== "") {
      payload.oxygen_saturation = Number(vitalsForm.oxygen_saturation);
    }
    if (vitalsForm.respiratory_rate !== "") {
      payload.respiratory_rate = Number(vitalsForm.respiratory_rate);
    }
    if (vitalsForm.blood_sugar !== "") payload.blood_sugar = Number(vitalsForm.blood_sugar);
    return payload;
  };

  const handleVitalsSubmit = async (e) => {
    e.preventDefault();
    if (!vitalsAppointment) return;
    setVitalsSaving(true);
    setVitalsError("");
    try {
      await saveAppointmentVitals(vitalsAppointment.id, buildVitalsPayload());
      closeVitals();
      await load();
    } catch (err) {
      setVitalsError(getApiErrorMessage(err, "Failed to save vitals."));
    } finally {
      setVitalsSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const label = row.patient?.name || "this appointment";
    if (!window.confirm(`Delete appointment for "${label}"?`)) return;
    setError("");
    try {
      await deleteAppointment(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete appointment."));
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  };

  const selectedDoctor = doctors.find((d) => String(d.id) === form.doctor_id);
  const { total, balanceDue } = calcTotals(
    form.previous_due,
    form.charge_amount,
    form.paid_amount
  );

  return (
    <section className="page-card appointments-page">
      <div className="page-card-header">
        <h2>Appointments</h2>
        <p>
          {isSuperAdmin
            ? "Appointments are mapped to a clinic. Patient and doctor must belong to the same company."
            : `Appointments for ${user?.company?.name || "your clinic"}.`}
        </p>
      </div>

      <div className="crud-toolbar">
        <div className="tenant-toolbar-left">
          <span>{loading ? "Loading…" : `${items.length} appointment(s)`}</span>
          {isSuperAdmin && (
            <CompanySelect
              variant="inline"
              allowAll
              label="Filter clinic"
              id="appt_filter_company_id"
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              required={false}
            />
          )}
        </div>
        {!isDoctor && (
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
            Add appointment
          </button>
        )}
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap appointments-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Clinic / company</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Prev. due</th>
              <th>Charge</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance due</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={11} className="crud-empty">
                  No appointments yet.
                </td>
              </tr>
            )}
            {items.map((row) => {
              const b = row.billing;
              return (
                <tr key={row.id}>
                  <td>{formatDate(row.appointment_date)}</td>
                  <td>
                    <span className="tenant-company-badge">
                      {row.company?.name || row.patient?.company?.name || "—"}
                    </span>
                  </td>
                  <td>{row.patient?.name || "—"}</td>
                  <td>{row.doctor?.user?.name || "—"}</td>
                  <td>${Number(b?.previous_due || 0).toFixed(2)}</td>
                  <td>${Number(b?.charge_amount || 0).toFixed(2)}</td>
                  <td>${Number(b?.total_amount || 0).toFixed(2)}</td>
                  <td>${Number(b?.paid_amount || 0).toFixed(2)}</td>
                  <td>
                    <strong>${Number(b?.due_amount || 0).toFixed(2)}</strong>
                  </td>
                  <td>{row.status}</td>
                  <td>
                    <div className="crud-actions crud-actions--stack">
                      <button
                        type="button"
                        className="crud-btn crud-btn--ghost crud-btn--sm"
                        onClick={() => openVitals(row)}
                      >
                        Vitals
                      </button>
                      <button
                        type="button"
                        className="crud-btn crud-btn--ghost crud-btn--sm"
                        onClick={() => openEdit(row)}
                      >
                        Edit
                      </button>
                      {b?.id && (
                        <button
                          type="button"
                          className="crud-btn crud-btn--ghost crud-btn--sm"
                          onClick={() => openBillingInvoice(b.id)}
                        >
                          Invoice
                        </button>
                      )}
                      <button
                        type="button"
                        className="crud-btn crud-btn--ghost crud-btn--sm"
                        onClick={() => openPrescription(row.id)}
                      >
                        Rx
                      </button>
                      {!isDoctor && (
                        <button
                          type="button"
                          className="crud-btn crud-btn--danger crud-btn--sm"
                          onClick={() => handleDelete(row)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        title={
          vitalsAppointment
            ? `Patient vitals — ${vitalsAppointment.patient?.name || ""}`
            : "Patient vitals"
        }
        open={vitalsOpen}
        onClose={closeVitals}
      >
        <form onSubmit={handleVitalsSubmit}>
          {vitalsError && <div className="crud-alert crud-alert--error">{vitalsError}</div>}
          <div className="crud-form-grid">
            <div className="crud-field">
              <label htmlFor="blood_pressure">Blood pressure (mmHg)</label>
              <input
                id="blood_pressure"
                name="blood_pressure"
                value={vitalsForm.blood_pressure}
                onChange={handleVitalsChange}
                placeholder="80-120"
                pattern="\d{2,3}-\d{2,3}"
                title="Format: systolic-diastolic e.g. 120-80"
              />
              <span className="field-hint">Systolic-diastolic, e.g. 120-80</span>
            </div>
            <div className="crud-field">
              <label htmlFor="heart_rate">Heart rate (bpm)</label>
              <input
                id="heart_rate"
                name="heart_rate"
                type="number"
                min="0"
                value={vitalsForm.heart_rate}
                onChange={handleVitalsChange}
                placeholder="72"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="body_temperature">Body temperature (°C)</label>
              <input
                id="body_temperature"
                name="body_temperature"
                type="number"
                step="0.1"
                min="30"
                max="45"
                value={vitalsForm.body_temperature}
                onChange={handleVitalsChange}
                placeholder="37.0"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="oxygen_saturation">Oxygen saturation (%)</label>
              <input
                id="oxygen_saturation"
                name="oxygen_saturation"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={vitalsForm.oxygen_saturation}
                onChange={handleVitalsChange}
                placeholder="98"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="respiratory_rate">Respiratory rate (/min)</label>
              <input
                id="respiratory_rate"
                name="respiratory_rate"
                type="number"
                min="0"
                value={vitalsForm.respiratory_rate}
                onChange={handleVitalsChange}
                placeholder="16"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="blood_sugar">Blood sugar (mg/dL)</label>
              <input
                id="blood_sugar"
                name="blood_sugar"
                type="number"
                step="0.1"
                min="0"
                value={vitalsForm.blood_sugar}
                onChange={handleVitalsChange}
                placeholder="100"
              />
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={closeVitals}>
              Cancel
            </button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={vitalsSaving}>
              {vitalsSaving ? "Saving…" : "Save vitals"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        title={editing ? "Edit appointment" : "Add appointment"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <p className="form-section-label">Visit details</p>
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
                    {isSuperAdmin && p.company?.name ? ` — ${p.company.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="doctor_id">Doctor</label>
              <select
                id="doctor_id"
                name="doctor_id"
                value={form.doctor_id}
                onChange={handleChange}
                required
              >
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.user?.name} ({d.department?.name || "—"}) — $
                    {Number(d.consultation_fee || 0).toFixed(2)}
                    {isSuperAdmin && d.company?.name ? ` — ${d.company.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="appointment_date">Date & time</label>
              <input
                id="appointment_date"
                name="appointment_date"
                type="datetime-local"
                value={form.appointment_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="crud-field">
              <label htmlFor="duration_minutes">Duration (min)</label>
              <input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min="5"
                max="480"
                value={form.duration_minutes}
                onChange={handleChange}
                required
              />
            </div>
            {(checkingAvailability || availabilityMsg) && (
              <div className="crud-field crud-field--full">
                <div
                  className={`crud-alert ${
                    availabilityOk === false
                      ? "crud-alert--error"
                      : availabilityOk
                        ? ""
                        : ""
                  }`}
                  style={
                    availabilityOk
                      ? { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }
                      : undefined
                  }
                >
                  {checkingAvailability ? "Checking availability…" : availabilityMsg}
                </div>
              </div>
            )}
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
              <label htmlFor="reason">Reason</label>
              <input id="reason" name="reason" value={form.reason} onChange={handleChange} />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="prescription">Prescription</label>
              <textarea
                id="prescription"
                name="prescription"
                value={form.prescription}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} />
            </div>
          </div>

          <p className="form-section-label">Billing (billings table)</p>
          <div className="billing-summary-box">
            <p>
              <strong>Previous due</strong> (from last visit):{" "}
              {loadingBalance ? "…" : `$${Number(form.previous_due || 0).toFixed(2)}`}
            </p>
            <p>
              <strong>+ Doctor charge</strong>: ${Number(form.charge_amount || 0).toFixed(2)}
              {selectedDoctor && (
                <span className="field-hint"> (fee: ${Number(selectedDoctor.consultation_fee || 0).toFixed(2)})</span>
              )}
            </p>
            <p>
              <strong>= Total payable</strong>: ${total.toFixed(2)}
            </p>
            <p className="billing-summary-due">
              <strong>− Paid now</strong> → <strong>Balance due</strong>: ${balanceDue.toFixed(2)}
            </p>
          </div>

          <div className="crud-form-grid">
            <div className="crud-field">
              <label htmlFor="previous_due">Previous due</label>
              <input
                id="previous_due"
                name="previous_due"
                type="number"
                step="0.01"
                min="0"
                value={form.previous_due}
                onChange={handleChange}
                readOnly={!editing}
                title={editing ? "Adjust if needed" : "Auto from patient balance"}
              />
            </div>
            <div className="crud-field">
              <label htmlFor="charge_amount">Doctor charge</label>
              <input
                id="charge_amount"
                name="charge_amount"
                type="number"
                step="0.01"
                min="0"
                value={form.charge_amount}
                onChange={handleChange}
                required
              />
            </div>
            <div className="crud-field">
              <label htmlFor="paid_amount">Paid now</label>
              <input
                id="paid_amount"
                name="paid_amount"
                type="number"
                step="0.01"
                min="0"
                value={form.paid_amount}
                onChange={handleChange}
                required
              />
            </div>
            <div className="crud-field">
              <label>Balance due (saved)</label>
              <input
                type="text"
                readOnly
                className="readonly-total"
                value={`$${balanceDue.toFixed(2)}`}
              />
            </div>
            <div className="crud-field">
              <label htmlFor="payment_method">Payment method</label>
              <select
                id="payment_method"
                name="payment_method"
                value={form.payment_method}
                onChange={handleChange}
              >
                <option value="">—</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
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
              />
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

export default Appointments;
