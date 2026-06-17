import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import { getDepartments } from "../api/departments";
import {
  createDoctor,
  deleteDoctor,
  getDoctors,
  updateDoctor,
} from "../api/doctors";
import { useAuth } from "../auth/AuthContext";
import BranchSelect from "../components/BranchSelect";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Doctors.css";

const emptyForm = {
  company_id: "",
  branch_id: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  status: true,
  doctor_code: "",
  department_id: "",
  qualification: "",
  experience_years: "",
  license_number: "",
  consultation_fee: "",
  bio: "",
};

function Doctors() {
  const navigate = useNavigate();
  const { isDoctor, isSuperAdmin, isCompanyAdmin } = useAuth();
  const canManageSchedule = isSuperAdmin || isCompanyAdmin;
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterBranchId, setFilterBranchId] = useState("");
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
      const [doctorRes, deptRes] = await Promise.all([getDoctors(), getDepartments()]);
      setItems(doctorRes.data);
      setDepartments(deptRes.data.filter((d) => d.is_active));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load doctors."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (doctor) => {
    const u = doctor.user || {};
    setEditing(doctor);
    setForm({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      password: "",
      status: Boolean(u.status),
      company_id: String(doctor.company_id || ""),
      branch_id: String(doctor.branch_id || ""),
      doctor_code: doctor.doctor_code || "",
      department_id: String(doctor.department_id || doctor.department?.id || ""),
      qualification: doctor.qualification || "",
      experience_years: doctor.experience_years ?? "",
      license_number: doctor.license_number || "",
      consultation_fee: doctor.consultation_fee ?? "",
      bio: doctor.bio || "",
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
    if (!payload.doctor_code) delete payload.doctor_code;
    payload.department_id = Number(payload.department_id);
    if (!payload.experience_years) payload.experience_years = null;
    else payload.experience_years = Number(payload.experience_years);
    if (!payload.consultation_fee) payload.consultation_fee = null;
    else payload.consultation_fee = Number(payload.consultation_fee);
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload();
      if (editing) {
        await updateDoctor(editing.id, payload);
      } else {
        await createDoctor(payload);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save doctor."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doctor) => {
    const name = doctor.user?.name || doctor.doctor_code;
    if (!window.confirm(`Delete doctor "${name}"?`)) return;
    setError("");
    try {
      await deleteDoctor(doctor.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete doctor."));
    }
  };

  return (
    <section className="page-card doctors-page">
      <div className="page-card-header">
        <h2>Doctor records</h2>
        <p>Manage doctor accounts and professional details.</p>
      </div>

      <div className="crud-toolbar">
        <div className="tenant-toolbar-left">
          <span>{loading ? "Loading…" : `${items.length} doctor(s)`}</span>
          <BranchSelect
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            allLabel="All branches"
            id="doctor_branch_filter"
            name="branch_filter"
          />
        </div>
        {!isDoctor && (
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
            Add doctor
          </button>
        )}
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Branch</th>
              <th>Fee</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="crud-empty">
                  No doctors yet. Click &quot;Add doctor&quot; to create one.
                </td>
              </tr>
            )}
            {items
              .filter((d) => !filterBranchId || String(d.branch_id) === filterBranchId)
              .map((doctor) => (
              <tr key={doctor.id}>
                <td>{doctor.doctor_code}</td>
                <td>
                  <div>{doctor.user?.name}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--me-text-muted)" }}>{doctor.user?.email}</div>
                </td>
                <td>{doctor.department?.name || doctor.specialization || "—"}</td>
                <td>
                  {doctor.branch
                    ? <span className="branch-pill">{doctor.branch.name}</span>
                    : <span style={{ color: "var(--me-text-muted)" }}>—</span>}
                </td>
                <td>
                  {doctor.consultation_fee != null
                    ? `₹${Number(doctor.consultation_fee).toFixed(0)}`
                    : "—"}
                </td>
                <td>
                  <span
                    className={`crud-badge ${
                      doctor.user?.status
                        ? "crud-badge--active"
                        : "crud-badge--inactive"
                    }`}
                  >
                    {doctor.user?.status ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="crud-actions crud-actions--stack">
                    {canManageSchedule && (
                      <button
                        type="button"
                        className="crud-btn crud-btn--ghost crud-btn--sm"
                        onClick={() => navigate(`/doctors/${doctor.id}/availability`)}
                      >
                        Schedule
                      </button>
                    )}
                    <button
                      type="button"
                      className="crud-btn crud-btn--ghost crud-btn--sm"
                      onClick={() => openEdit(doctor)}
                    >
                      Edit
                    </button>
                    {!isDoctor && (
                      <button
                        type="button"
                        className="crud-btn crud-btn--danger crud-btn--sm"
                        onClick={() => handleDelete(doctor)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* add and edit doctor modal */}
      <Modal
        title={editing ? "Edit doctor" : "Add doctor"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            <CompanySelect value={form.company_id} onChange={handleChange} />
            <div className="crud-field">
              <label htmlFor="branch_id">Branch</label>
              <BranchSelect
                value={form.branch_id}
                onChange={handleChange}
                companyId={form.company_id}
                allLabel="No branch assigned"
                id="branch_id"
              />
            </div>
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
              <label htmlFor="department_id">Department / speciality</label>
              <select
                id="department_id"
                name="department_id"
                value={form.department_id}
                onChange={handleChange}
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.code ? ` (${d.code})` : ""}
                  </option>
                ))}
              </select>
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
              <label htmlFor="qualification">Qualification</label>
              <input
                id="qualification"
                name="qualification"
                value={form.qualification}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field">
              <label htmlFor="experience_years">Experience (years)</label>
              <input
                id="experience_years"
                name="experience_years"
                type="number"
                min="0"
                value={form.experience_years}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field">
              <label htmlFor="license_number">License number</label>
              <input
                id="license_number"
                name="license_number"
                value={form.license_number}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field">
              <label htmlFor="consultation_fee">Consultation fee</label>
              <input
                id="consultation_fee"
                name="consultation_fee"
                type="number"
                step="0.01"
                min="0"
                value={form.consultation_fee}
                onChange={handleChange}
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" name="bio" value={form.bio} onChange={handleChange} />
            </div>
            <div className="crud-field crud-checkbox">
              <label>
                <input
                  type="checkbox"
                  name="status"
                  checked={form.status}
                  onChange={handleChange}
                />
                Active account
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

export default Doctors;
