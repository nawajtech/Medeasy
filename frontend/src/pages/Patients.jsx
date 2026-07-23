import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import {
  createPatient,
  deletePatient,
  downloadPatientSample,
  exportPatients,
  getPatients,
  importPatients,
  updatePatient,
} from "../api/patients";
import { useAuth } from "../auth/AuthContext";
import Can from "../components/Can";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Patients.css";

const emptyForm = {
  company_id: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  status: true,
  patient_code: "",
  gender: "",
  date_of_birth: "",
  blood_group: "",
  height: "",
  weight: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  allergies: "",
  medical_history: "",
};

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return "—";
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return "—";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? `${age} yrs` : "—";
}

function Patients() {
  const { isDoctor, isSuperAdmin, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [downloadingSample, setDownloadingSample] = useState(false);
  const importInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (isSuperAdmin && filterCompanyId) {
        params.company_id = filterCompanyId;
      }
      const { data } = await getPatients(params);
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load patients."));
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, filterCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (patient) => {
    setEditing(patient);
    setForm({
      name: patient.name || "",
      email: patient.email || "",
      phone: patient.phone || "",
      password: "",
      status: Boolean(patient.status),
      company_id: String(patient.company_id || ""),
      patient_code: patient.patient_code || "",
      gender: patient.gender || "",
      date_of_birth: patient.date_of_birth?.slice(0, 10) || "",
      blood_group: patient.blood_group || "",
      height: patient.height ?? "",
      weight: patient.weight ?? "",
      address: patient.address || "",
      emergency_contact_name: patient.emergency_contact_name || "",
      emergency_contact_phone: patient.emergency_contact_phone || "",
      allergies: patient.allergies || "",
      medical_history: patient.medical_history || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const buildPayload = () => {
    const payload = { ...form };
    if (editing && !payload.password) delete payload.password;
    if (!payload.patient_code) delete payload.patient_code;
    if (!payload.gender) payload.gender = null;
    if (!payload.height) payload.height = null;
    else payload.height = Number(payload.height);
    if (!payload.weight) payload.weight = null;
    else payload.weight = Number(payload.weight);
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      if (editing) {
        await updatePatient(editing.id, payload);
      } else {
        await createPatient(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save patient."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (patient) => {
    const name = patient.name || patient.patient_code;
    if (!window.confirm(`Delete patient "${name}"?`)) return;
    setError("");
    try {
      await deletePatient(patient.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete patient."));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    setImportResult(null);
    try {
      const params = {};
      if (isSuperAdmin && filterCompanyId) {
        params.company_id = filterCompanyId;
      }
      await exportPatients(params);
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    if (isSuperAdmin && !filterCompanyId) {
      setError("Select a clinic before importing patients.");
      return;
    }
    importInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (isSuperAdmin && !filterCompanyId) {
      setError("Select a clinic before importing patients.");
      return;
    }

    setImporting(true);
    setError("");
    setImportResult(null);
    try {
      const { data } = await importPatients(file, isSuperAdmin ? filterCompanyId : undefined);
      setImportResult(data);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Import failed."));
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadSample = async () => {
    setDownloadingSample(true);
    setError("");
    try {
      await downloadPatientSample();
    } catch (err) {
      setError(err.message || "Could not download sample file.");
    } finally {
      setDownloadingSample(false);
    }
  };

  return (
    <section className="page-card patients-page">
      <div className="page-card-header">
        <h2>Patient records</h2>
        <p>
          {isSuperAdmin
            ? "Patients are mapped to a clinic/company. Use the filter or company column to see ownership."
            : `Patients for ${user?.company?.name || "your clinic"}.`}
        </p>
      </div>

      <div className="crud-toolbar patients-toolbar">
        <div className="tenant-toolbar-left">
          <span>{loading ? "Loading…" : `${items.length} patient(s)`}</span>
          {isSuperAdmin && (
            <CompanySelect
              variant="inline"
              allowAll
              label="Filter clinic"
              id="filter_company_id"
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              required={false}
            />
          )}
        </div>
        <div className="crud-toolbar-actions">
          {!isDoctor && (
            <>
              <Can permission="patient.view">
                <button
                  type="button"
                  className="crud-btn crud-btn--export"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? "Exporting…" : "Export Excel"}
                </button>
              </Can>
              <Can permission="patient.create">
                <div className="spreadsheet-import-compact">
                  <button
                    type="button"
                    className="crud-btn crud-btn--import"
                    onClick={handleImportClick}
                    disabled={importing}
                  >
                    {importing ? "Importing…" : "Import Excel"}
                  </button>
                  <button
                    type="button"
                    className="spreadsheet-sample-link"
                    onClick={handleDownloadSample}
                    disabled={downloadingSample}
                    title="Download .xls sample with required columns: name, email, phone"
                  >
                    {downloadingSample ? "Downloading…" : "Sample template"}
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv,.xls,text/csv,application/vnd.ms-excel"
                    className="spreadsheet-import-input"
                    onChange={handleImportFile}
                  />
                </div>
              </Can>
            </>
          )}
          <Can permission="patient.create">
            <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
              Add patient
            </button>
          </Can>
        </div>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}
      {importResult && (
        <div className="spreadsheet-import-result">
          {importResult.message}
          {importResult.skipped > 0 && ` Skipped ${importResult.skipped} row(s).`}
          {importResult.errors?.length > 0 && (
            <ul className="spreadsheet-import-errors">
              {importResult.errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="crud-table-wrap patients-table-wrap">
        <table className="crud-table patients-table">
          <thead>
            <tr>
              <th>Code</th>
              {isSuperAdmin && <th>Clinic</th>}
              <th>Patient</th>
              <th>Age</th>
              <th>Blood</th>
              <th>H / W</th>
              <th>Emergency</th>
              <th>Wallet</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={isSuperAdmin ? 10 : 9} className="crud-empty">
                  No patients yet. Add one or import an Excel file.
                </td>
              </tr>
            )}
            {items.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.patient_code}</td>
                {isSuperAdmin && (
                  <td>
                    <span className="tenant-company-badge" title={patient.company?.code || ""}>
                      {patient.company?.name || "—"}
                    </span>
                  </td>
                )}
                <td className="patients-table__contact">
                  <div className="patients-table__name">
                    {patient.name}
                    {patient.gender ? (
                      <span className="patients-table__gender"> ({patient.gender})</span>
                    ) : null}
                  </div>
                  <div>{patient.email}</div>
                  <div>{patient.phone || "—"}</div>
                </td>
                <td>{calcAge(patient.date_of_birth)}</td>
                <td>{patient.blood_group || "—"}</td>
                <td className="patients-table__hw">
                  <div>{patient.height != null ? `${patient.height} cm` : "—"}</div>
                  <div>{patient.weight != null ? `${patient.weight} kg` : "—"}</div>
                </td>
                <td className="patients-table__emergency">
                  {patient.emergency_contact_name
                    ? `${patient.emergency_contact_name}${patient.emergency_contact_phone ? ` (${patient.emergency_contact_phone})` : ""}`
                    : "—"}
                </td>
                <td className="patients-table__wallet">
                  <Link
                    to={`/patients/${patient.id}?tab=wallet`}
                    className="patients-wallet-link"
                    title="View wallet & transaction history"
                  >
                    ₹{Number(patient.wallet?.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Link>
                </td>
                <td>
                  <span
                    className={`crud-badge ${
                      patient.status ? "crud-badge--active" : "crud-badge--inactive"
                    }`}
                  >
                    {patient.status ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="crud-actions patients-actions">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="crud-btn crud-btn--primary crud-btn--sm"
                    >
                      Chart
                    </Link>
                    <Can permission="patient.edit">
                      <button
                        type="button"
                        className="crud-btn crud-btn--ghost crud-btn--sm"
                        onClick={() => openEdit(patient)}
                      >
                        Edit
                      </button>
                    </Can>
                    <Can permission="patient.delete">
                      <button
                        type="button"
                        className="crud-btn crud-btn--danger crud-btn--sm"
                        onClick={() => handleDelete(patient)}
                      >
                        Delete
                      </button>
                    </Can>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        title={editing ? "Edit patient" : "Add patient"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            <CompanySelect value={form.company_id} onChange={handleChange} />
            {!isSuperAdmin && user?.company?.name && (
              <div className="crud-field">
                <label>Clinic / company</label>
                <input type="text" value={user.company.name} readOnly disabled />
              </div>
            )}
            <div className="crud-field">
              <label htmlFor="name">Full name</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Enter full name" />
            </div>
            <div className="crud-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="Enter email"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="patient_code">
                Patient code{editing ? "" : " (auto if empty)"}
              </label>
              <input
                id="patient_code"
                name="patient_code"
                value={form.patient_code}
                onChange={handleChange}
                required={Boolean(editing)}
                placeholder="Enter patient code"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="phone">Mobile number *</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} required placeholder="Enter phone number" />
            </div>
            <div className="crud-field">
              <label htmlFor="password">
                Password{editing ? " (leave blank to keep)" : ""}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required={!editing}
                minLength={8}
                placeholder="Enter password"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" value={form.gender} onChange={handleChange}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="crud-field">
              <label htmlFor="date_of_birth">Date of birth</label>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={handleChange}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="blood_group">Blood group</label>
              <input
                id="blood_group"
                name="blood_group"
                value={form.blood_group}
                onChange={handleChange}
                placeholder="e.g. A+"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="height">Height (cm)</label>
              <input
                id="height"
                name="height"
                type="number"
                step="0.01"
                value={form.height}
                onChange={handleChange}
                placeholder="Height in cm"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="weight">Weight (kg)</label>
              <input
                id="weight"
                name="weight"
                type="number"
                step="0.01"
                value={form.weight}
                onChange={handleChange}
                placeholder="Weight in kg"
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="address">Address</label>
              <textarea id="address" name="address" value={form.address} onChange={handleChange} placeholder="Enter address" />
            </div>
            <div className="crud-field">
              <label htmlFor="emergency_contact_name">Emergency contact</label>
              <input
                id="emergency_contact_name"
                name="emergency_contact_name"
                value={form.emergency_contact_name}
                onChange={handleChange}
                placeholder="Enter emergency contact name"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="emergency_contact_phone">Emergency phone</label>
              <input
                id="emergency_contact_phone"
                name="emergency_contact_phone"
                value={form.emergency_contact_phone}
                onChange={handleChange}
                placeholder="Enter emergency phone"
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="allergies">Allergies</label>
              <textarea
                id="allergies"
                name="allergies"
                value={form.allergies}
                onChange={handleChange}
                placeholder="Enter allergies (optional)"
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="medical_history">Medical history</label>
              <textarea
                id="medical_history"
                name="medical_history"
                value={form.medical_history}
                onChange={handleChange}
                placeholder="Enter medical history (optional)"
              />
            </div>
            <div className="crud-field crud-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="status"
                  checked={form.status}
                  onChange={handleChange}
                />
                Active
              </label>
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

export default Patients;
