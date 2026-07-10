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
  uploadPrescription,
} from "../api/appointments";
import { getPatientBalance, openBillingInvoice } from "../api/billings";
import { checkDoctorAvailability } from "../api/doctorAvailabilities";
import { getDoctors } from "../api/doctors";
import { getPatients } from "../api/patients";
import { useAuth } from "../auth/AuthContext";
import BranchSelect from "../components/BranchSelect";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import PrescriptionEntryModal from "../components/prescription/PrescriptionEntryModal";
import "../components/prescription/PrescriptionEntry.css";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCurrency } from "../config/currency";
import "./Appointments.css";

const STATUS_OPTIONS = [
  { value: "booked", label: "Booked" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const emptyVitalsForm = {
  blood_pressure: "",
  heart_rate: "",
  body_temperature: "",
  oxygen_saturation: "",
  respiratory_rate: "",
  blood_sugar: "",
};

const emptyPayForm = {
  previous_due: "0",
  charge_amount: "",
  paid_amount: "0",
  payment_method: "",
  billed_at: "",
};

const emptyForm = {
  patient_id: "",
  doctor_id: "",
  branch_id: "",
  appointment_date: "",
  duration_minutes: "30",
  status: "booked",
  reason: "",
  notes: "",
  prescription_type: "handwritten",
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

function rowToPayload(row, overrides = {}) {
  const b = row.billing || {};
  return {
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    branch_id: row.branch_id || null,
    duration_minutes: row.duration_minutes ?? 30,
    appointment_date: row.appointment_date,
    status: row.status,
    reason: row.reason || null,
    notes: row.notes || null,
    prescription_type: row.prescription_type || (row.prescription_file ? "upload" : "handwritten"),
    prescription: row.prescription || null,
    previous_due: Number(b.previous_due) || 0,
    charge_amount: Number(b.charge_amount) || 0,
    paid_amount: Number(b.paid_amount) || 0,
    payment_method: b.payment_method || null,
    billed_at: b.billed_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    ...overrides,
  };
}

function prescriptionPreview(row) {
  if (row.prescription_type === "upload" || row.prescription_file) {
    return row.prescription_file_url ? "Uploaded file" : "No file yet";
  }
  if (row.prescription_type === "structured" && row.prescription_data?.items?.length) {
    const n = row.prescription_data.items.length;
    const first = row.prescription_data.items[0]?.name;
    return n === 1 ? first : `${n} medicines · ${first}…`;
  }
  if (row.prescription) {
    return row.prescription.length > 60 ? `${row.prescription.slice(0, 60)}…` : row.prescription;
  }
  return "—";
}

function visitOverridesFromForm(form) {
  return {
    patient_id: Number(form.patient_id),
    doctor_id: Number(form.doctor_id),
    branch_id: form.branch_id ? Number(form.branch_id) : null,
    duration_minutes: Number(form.duration_minutes) || 30,
    appointment_date: new Date(form.appointment_date).toISOString(),
    status: form.status,
    reason: form.reason || null,
    notes: form.notes || null,
    prescription_type: form.prescription_type,
    prescription: form.prescription_type === "handwritten" ? form.prescription || null : null,
  };
}

function billingFieldsFromForm(source) {
  return {
    previous_due: Number(source.previous_due) || 0,
    charge_amount: Number(source.charge_amount) || 0,
    paid_amount: Number(source.paid_amount) || 0,
    payment_method: source.payment_method || null,
    billed_at: source.billed_at || new Date().toISOString().slice(0, 10),
  };
}

function Appointments() {
  const { isSuperAdmin, isDoctor, user } = useAuth();
  const [items, setItems] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
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
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [existingPrescriptionFileUrl, setExistingPrescriptionFileUrl] = useState("");
  const [rxOpen, setRxOpen] = useState(false);
  const [rxAppointment, setRxAppointment] = useState(null);
  const [rxSaving, setRxSaving] = useState(false);
  const [rxError, setRxError] = useState("");
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payAppointment, setPayAppointment] = useState(null);
  const [payForm, setPayForm] = useState(emptyPayForm);
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState("");

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
    setPrescriptionFile(null);
    setExistingPrescriptionFileUrl("");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    const b = row.billing || {};
    setEditing(row);
    setForm({
      patient_id: String(row.patient_id),
      doctor_id: String(row.doctor_id),
      branch_id: String(row.branch_id || ""),
      appointment_date: toLocalDatetime(row.appointment_date),
      duration_minutes: String(row.duration_minutes ?? 30),
      status: row.status || "booked",
      reason: row.reason || "",
      notes: row.notes || "",
      prescription_type: row.prescription_type || (row.prescription_file ? "upload" : "handwritten"),
      prescription: row.prescription || "",
      previous_due: String(b.previous_due ?? 0),
      charge_amount: b.charge_amount ?? "",
      paid_amount: String(b.paid_amount ?? 0),
      payment_method: b.payment_method || "",
      billed_at: b.billed_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    });
    setPrescriptionFile(null);
    setExistingPrescriptionFileUrl(row.prescription_file_url || "");
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
    setPrescriptionFile(null);
    setExistingPrescriptionFileUrl("");
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
    ...visitOverridesFromForm(form),
    ...billingFieldsFromForm(form),
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
      let appointmentId;
      if (editing) {
        await updateAppointment(editing.id, rowToPayload(editing, visitOverridesFromForm(form)));
        appointmentId = editing.id;
      } else {
        const { data } = await createAppointment(buildPayload());
        appointmentId = data.id;
      }
      if (form.prescription_type === "upload" && prescriptionFile) {
        await uploadPrescription(appointmentId, prescriptionFile);
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

  const handleOpenInvoice = async (billingId) => {
    setError("");
    try {
      await openBillingInvoice(billingId);
    } catch (err) {
      setError(err.message || "Failed to open invoice.");
    }
  };

  const handleOpenPrescription = async (appointmentId) => {
    setError("");
    try {
      await openPrescription(appointmentId);
    } catch (err) {
      setError(err.message || "Failed to open prescription.");
    }
  };

  const handleStatusChange = async (row, newStatus) => {
    if (newStatus === row.status) return;
    setStatusSavingId(row.id);
    setError("");
    try {
      await updateAppointment(row.id, rowToPayload(row, { status: newStatus }));
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update status."));
    } finally {
      setStatusSavingId(null);
    }
  };

  const openPaymentModal = (row) => {
    const b = row.billing || {};
    setPayAppointment(row);
    setPayForm({
      previous_due: String(b.previous_due ?? 0),
      charge_amount: b.charge_amount ?? "",
      paid_amount: String(b.paid_amount ?? 0),
      payment_method: b.payment_method || "",
      billed_at: b.billed_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    });
    setPayError("");
    setPayOpen(true);
  };

  const closePaymentModal = () => {
    setPayOpen(false);
    setPayAppointment(null);
    setPayForm(emptyPayForm);
    setPayError("");
  };

  const handlePayChange = (e) => {
    const { name, value } = e.target;
    setPayForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payAppointment) return;
    setPaySaving(true);
    setPayError("");
    try {
      await updateAppointment(payAppointment.id, rowToPayload(payAppointment, billingFieldsFromForm(payForm)));
      closePaymentModal();
      await load();
    } catch (err) {
      setPayError(getApiErrorMessage(err, "Failed to save payment."));
    } finally {
      setPaySaving(false);
    }
  };

  const openRxModal = (row) => {
    setRxAppointment(row);
    setPrescriptionFile(null);
    setExistingPrescriptionFileUrl(row.prescription_file_url || "");
    setRxError("");
    setRxOpen(true);
  };

  const closeRxModal = () => {
    setRxOpen(false);
    setRxAppointment(null);
    setPrescriptionFile(null);
    setExistingPrescriptionFileUrl("");
    setRxError("");
  };

  const handleRxSave = async (payload) => {
    if (!rxAppointment) return;
    setRxSaving(true);
    setRxError("");
    try {
      await updateAppointment(rxAppointment.id, rowToPayload(rxAppointment, payload));
      if (payload.prescription_type === "upload" && prescriptionFile) {
        await uploadPrescription(rxAppointment.id, prescriptionFile);
      }
      closeRxModal();
      await load();
    } catch (err) {
      setRxError(getApiErrorMessage(err, "Failed to save prescription."));
    } finally {
      setRxSaving(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  };

  const selectedDoctor = doctors.find((d) => String(d.id) === form.doctor_id);
  const payDoctor = doctors.find((d) => d.id === payAppointment?.doctor_id);
  const { total, balanceDue } = calcTotals(
    form.previous_due,
    form.charge_amount,
    form.paid_amount
  );
  const payTotals = calcTotals(payForm.previous_due, payForm.charge_amount, payForm.paid_amount);

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
          <BranchSelect
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            companyId={filterCompanyId}
            allLabel="All branches"
            id="appt_branch_filter"
            name="appt_branch_filter"
          />
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
              <th>Payment</th>
              <th>Status</th>
              <th>Prescription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="crud-empty">
                  No appointments yet.
                </td>
              </tr>
            )}
            {items
              .filter((r) => !filterBranchId || String(r.branch_id) === filterBranchId)
              .map((row) => {
              const b = row.billing;
              return (
                <tr key={row.id}>
                  <td>{formatDate(row.appointment_date)}</td>
                  <td>
                    <span className="tenant-company-badge">
                      {row.company?.name || row.patient?.company?.name || "—"}
                    </span>
                    {row.branch && (
                      <span className="branch-pill" style={{ marginLeft: 4 }}>
                        {row.branch.name}
                      </span>
                    )}
                  </td>
                  <td>{row.patient?.name || "—"}</td>
                  <td>{row.doctor?.user?.name || "—"}</td>
                  <td className="appt-grid-pay">
                    <div className="appt-pay-cell">
                      <strong
                        className={
                          Number(b?.due_amount || 0) > 0
                            ? "appt-pay-due appt-pay-due--pending"
                            : "appt-pay-due appt-pay-due--clear"
                        }
                      >
                        {formatCurrency(b?.due_amount, { decimals: 2 })} due
                      </strong>
                      <span className="appt-pay-meta">
                        Paid {formatCurrency(b?.paid_amount, { decimals: 2 })} /{" "}
                        {formatCurrency(b?.total_amount, { decimals: 2 })}
                      </span>
                      <button
                        type="button"
                        className="crud-btn crud-btn--ghost crud-btn--sm"
                        onClick={() => openPaymentModal(row)}
                      >
                        Payment
                      </button>
                    </div>
                  </td>
                  <td className="appt-grid-status">
                    <select
                      className={`appt-status-select appt-status-select--${row.status}`}
                      value={row.status}
                      disabled={statusSavingId === row.id}
                      onChange={(e) => handleStatusChange(row, e.target.value)}
                      aria-label={`Status for ${row.patient?.name || "appointment"}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="appt-grid-rx">
                    <div className="appt-rx-cell">
                      <span className={`appt-rx-type appt-rx-type--${row.prescription_type || "handwritten"}`}>
                        {row.prescription_type === "upload" || row.prescription_file
                          ? "Upload"
                          : row.prescription_type === "structured"
                            ? "Structured"
                            : "Handwritten"}
                      </span>
                      <p className="appt-rx-preview" title={row.prescription || ""}>
                        {prescriptionPreview(row)}
                      </p>
                      {row.prescription_file_url && (
                        <a
                          href={row.prescription_file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="appt-rx-link"
                        >
                          View file
                        </a>
                      )}
                      <button
                        type="button"
                        className="crud-btn crud-btn--ghost crud-btn--sm"
                        onClick={() => openRxModal(row)}
                      >
                        Edit Rx
                      </button>
                    </div>
                  </td>
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
                      <button
                        type="button"
                        className="crud-btn crud-btn--ghost crud-btn--sm"
                        onClick={() => handleOpenPrescription(row.id)}
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
        title={
          payAppointment
            ? `Payment — ${payAppointment.patient?.name || ""}`
            : "Payment"
        }
        open={payOpen}
        onClose={closePaymentModal}
      >
        <form onSubmit={handlePaySubmit}>
          {payError && <div className="crud-alert crud-alert--error">{payError}</div>}
          <div className="billing-summary-box">
            <p>
              <strong>Previous due</strong>: {formatCurrency(payForm.previous_due, { decimals: 2 })}
            </p>
            <p>
              <strong>+ Doctor charge</strong>: {formatCurrency(payForm.charge_amount, { decimals: 2 })}
              {payDoctor && (
                <span className="field-hint">
                  {" "}
                  (fee: {formatCurrency(payDoctor.consultation_fee, { decimals: 2 })})
                </span>
              )}
            </p>
            <p>
              <strong>= Total payable</strong>: {formatCurrency(payTotals.total, { decimals: 2 })}
            </p>
            <p className="billing-summary-due">
              <strong>− Paid now</strong> → <strong>Balance due</strong>:{" "}
              {formatCurrency(payTotals.balanceDue, { decimals: 2 })}
            </p>
          </div>
          <div className="crud-form-grid">
            <div className="crud-field">
              <label htmlFor="pay_previous_due">Previous due</label>
              <input
                id="pay_previous_due"
                name="previous_due"
                type="number"
                step="0.01"
                min="0"
                value={payForm.previous_due}
                onChange={handlePayChange}
              />
            </div>
            <div className="crud-field">
              <label htmlFor="pay_charge_amount">Doctor charge</label>
              <input
                id="pay_charge_amount"
                name="charge_amount"
                type="number"
                step="0.01"
                min="0"
                value={payForm.charge_amount}
                onChange={handlePayChange}
                required
              />
            </div>
            <div className="crud-field">
              <label htmlFor="pay_paid_amount">Paid now</label>
              <input
                id="pay_paid_amount"
                name="paid_amount"
                type="number"
                step="0.01"
                min="0"
                value={payForm.paid_amount}
                onChange={handlePayChange}
                required
              />
            </div>
            <div className="crud-field">
              <label>Balance due</label>
              <input
                type="text"
                readOnly
                className="readonly-total"
                value={formatCurrency(payTotals.balanceDue, { decimals: 2 })}
              />
            </div>
            <div className="crud-field">
              <label htmlFor="pay_payment_method">Payment method</label>
              <select
                id="pay_payment_method"
                name="payment_method"
                value={payForm.payment_method}
                onChange={handlePayChange}
              >
                <option value="">—</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="pay_billed_at">Billed date</label>
              <input
                id="pay_billed_at"
                name="billed_at"
                type="date"
                value={payForm.billed_at}
                onChange={handlePayChange}
              />
            </div>
          </div>
          <div className="crud-modal-actions">
            {payAppointment?.billing?.id && (
              <button
                type="button"
                className="crud-btn crud-btn--ghost"
                onClick={() => handleOpenInvoice(payAppointment.billing.id)}
              >
                Invoice
              </button>
            )}
            <button type="button" className="crud-btn crud-btn--ghost" onClick={closePaymentModal}>
              Cancel
            </button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={paySaving}>
              {paySaving ? "Saving…" : "Save payment"}
            </button>
          </div>
        </form>
      </Modal>

      <PrescriptionEntryModal
        open={rxOpen}
        onClose={closeRxModal}
        appointment={rxAppointment}
        saving={rxSaving}
        error={rxError}
        onSave={handleRxSave}
        onPrint={handleOpenPrescription}
        prescriptionFile={prescriptionFile}
        onPrescriptionFileChange={setPrescriptionFile}
        existingPrescriptionFileUrl={existingPrescriptionFileUrl}
      />

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
              <label htmlFor="appt_branch_id">Branch</label>
              <BranchSelect
                value={form.branch_id}
                onChange={handleChange}
                allLabel="No specific branch"
                id="appt_branch_id"
                name="branch_id"
              />
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
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="reason">Reason</label>
              <input id="reason" name="reason" value={form.reason} onChange={handleChange} />
            </div>
            <div className="crud-field crud-field--full">
              <span className="crud-field-label">Prescription type</span>
              <div className="prescription-type-options">
                <label>
                  <input
                    type="radio"
                    name="prescription_type"
                    value="handwritten"
                    checked={form.prescription_type === "handwritten"}
                    onChange={handleChange}
                  />
                  Handwritten
                </label>
                <label>
                  <input
                    type="radio"
                    name="prescription_type"
                    value="upload"
                    checked={form.prescription_type === "upload"}
                    onChange={handleChange}
                  />
                  Upload file
                </label>
              </div>
            </div>
            {form.prescription_type === "handwritten" ? (
              <div className="crud-field crud-field--full">
                <label htmlFor="prescription">Handwritten prescription</label>
                <textarea
                  id="prescription"
                  name="prescription"
                  value={form.prescription}
                  onChange={handleChange}
                  placeholder="Enter medicines, dosage, and instructions…"
                />
              </div>
            ) : (
              <div className="crud-field crud-field--full">
                <label htmlFor="prescription_file">Upload prescription (image or PDF)</label>
                <input
                  id="prescription_file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)}
                />
                {existingPrescriptionFileUrl && !prescriptionFile && (
                  <p className="field-hint">
                    Current file:{" "}
                    <a href={existingPrescriptionFileUrl} target="_blank" rel="noreferrer">
                      View uploaded prescription
                    </a>
                  </p>
                )}
              </div>
            )}
            <div className="crud-field crud-field--full">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} />
            </div>
          </div>

          {!editing && (
            <>
              <p className="form-section-label">Billing (billings table)</p>
              <div className="billing-summary-box">
                <p>
                  <strong>Previous due</strong> (from last visit):{" "}
                  {loadingBalance ? "…" : formatCurrency(form.previous_due, { decimals: 2 })}
                </p>
                <p>
                  <strong>+ Doctor charge</strong>: {formatCurrency(form.charge_amount, { decimals: 2 })}
                  {selectedDoctor && (
                    <span className="field-hint">
                      {" "}
                      (fee: {formatCurrency(selectedDoctor.consultation_fee, { decimals: 2 })})
                    </span>
                  )}
                </p>
                <p>
                  <strong>= Total payable</strong>: {formatCurrency(total, { decimals: 2 })}
                </p>
                <p className="billing-summary-due">
                  <strong>− Paid now</strong> → <strong>Balance due</strong>: {formatCurrency(balanceDue, { decimals: 2 })}
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
                    readOnly
                    title="Auto from patient balance"
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
                    value={formatCurrency(balanceDue, { decimals: 2 })}
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
            </>
          )}

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
