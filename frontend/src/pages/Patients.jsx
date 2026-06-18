import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import {
  createPatient,
  deletePatient,
  getPatients,
  updatePatient,
} from "../api/patients";
import { useAuth } from "../auth/AuthContext";
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
        {!isDoctor && (
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
            Add patient
          </button>
        )}
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap patients-table-wrap">
        <table className="crud-table patients-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Clinic / company</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Gender</th>
              <th>DOB</th>
              <th>Blood</th>
              <th>Height</th>
              <th>Weight</th>
              <th>Emergency</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={13} className="crud-empty">
                  No patients yet. Click &quot;Add patient&quot; to create one.
                </td>
              </tr>
            )}
            {items.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.patient_code}</td>
                <td>
                  <span className="tenant-company-badge" title={patient.company?.code || ""}>
                    {patient.company?.name || "—"}
                  </span>
                </td>
                <td>{patient.name}</td>
                <td>{patient.email}</td>
                <td>{patient.phone || "—"}</td>
                <td>{patient.gender || "—"}</td>
                <td>{patient.date_of_birth?.slice(0, 10) || "—"}</td>
                <td>{patient.blood_group || "—"}</td>
                <td>{patient.height != null ? `${patient.height} cm` : "—"}</td>
                <td>{patient.weight != null ? `${patient.weight} kg` : "—"}</td>
                <td>
                  {patient.emergency_contact_name
                    ? `${patient.emergency_contact_name}${patient.emergency_contact_phone ? ` (${patient.emergency_contact_phone})` : ""}`
                    : "—"}
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
                  <div className="crud-actions">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="crud-btn crud-btn--primary crud-btn--sm"
                    >
                      View chart
                    </Link>
                    {!isDoctor && (
                      <>
                        <button
                          type="button"
                          className="crud-btn crud-btn--ghost crud-btn--sm"
                          onClick={() => openEdit(patient)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="crud-btn crud-btn--danger crud-btn--sm"
                          onClick={() => handleDelete(patient)}
                        >
                          Delete
                        </button>
                      </>
                    )}
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
              <input id="name" name="name" value={form.name} onChange={handleChange} required />
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
              />
            </div>
            <div className="crud-field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} />
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
              />
            </div>
            <div className="crud-field">
              <label htmlFor="blood_group">Blood group</label>
              <input
                id="blood_group"
                name="blood_group"
                value={form.blood_group}
                onChange={handleChange}
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
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="address">Address</label>
              <textarea id="address" name="address" value={form.address} onChange={handleChange} />
            </div>
            <div className="crud-field">
              <label htmlFor="emergency_contact_name">Emergency contact</label>
              <input
                id="emergency_contact_name"
                name="emergency_contact_name"
                value={form.emergency_contact_name}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field">
              <label htmlFor="emergency_contact_phone">Emergency phone</label>
              <input
                id="emergency_contact_phone"
                name="emergency_contact_phone"
                value={form.emergency_contact_phone}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="allergies">Allergies</label>
              <textarea
                id="allergies"
                name="allergies"
                value={form.allergies}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="medical_history">Medical history</label>
              <textarea
                id="medical_history"
                name="medical_history"
                value={form.medical_history}
                onChange={handleChange}
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
