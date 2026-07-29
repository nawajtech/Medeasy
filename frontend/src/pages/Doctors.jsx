import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../App.css";
import { getCompaniesList } from "../api/companiesList";
import { getDepartments } from "../api/departments";
import {
  createDoctor,
  deleteDoctor,
  downloadDoctorSample,
  exportDoctors,
  getDoctors,
  importDoctors,
  updateDoctor,
} from "../api/doctors";
import { useAuth } from "../auth/AuthContext";
import BranchSelect from "../components/BranchSelect";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { modulesFromLegacyType, normalizeModules } from "../config/companyModules";
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
  const { isDoctor, isSuperAdmin, isCompanyAdmin, user } = useAuth();
  const canManageSchedule = isSuperAdmin || isCompanyAdmin;
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filterBranchId, setFilterBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
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
      const [doctorRes, deptRes] = await Promise.all([getDoctors(params), getDepartments()]);
      setItems(doctorRes.data);
      setDepartments(deptRes.data.filter((d) => d.is_active));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load doctors."));
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, filterCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  const filteredItems = items.filter((doctor) => {
    if (filterBranchId && String(doctor.branch_id) !== filterBranchId) return false;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const name = (doctor.user?.name || "").toLowerCase();
    const phone = (doctor.user?.phone || "").toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    getCompaniesList()
      .then((res) => setCompanies(res.data || []))
      .catch(() => setCompanies([]));
  }, [isSuperAdmin]);

  const formCompanyModules = useMemo(() => {
    if (isSuperAdmin && form.company_id) {
      const company = companies.find((c) => String(c.id) === String(form.company_id));
      if (company?.modules?.length) return normalizeModules(company.modules);
      return normalizeModules(modulesFromLegacyType(company?.type));
    }
    if (user?.company?.modules?.length) return normalizeModules(user.company.modules);
    return normalizeModules(modulesFromLegacyType(user?.company?.type));
  }, [isSuperAdmin, form.company_id, companies, user]);

  const hideConsultationFee = !formCompanyModules.includes("clinic");

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
    if (!isSuperAdmin) delete payload.company_id;
    payload.department_id = Number(payload.department_id);
    payload.experience_years = Number(payload.experience_years);
    if (hideConsultationFee) {
      payload.consultation_fee = 0;
    } else if (!payload.consultation_fee && payload.consultation_fee !== 0) {
      payload.consultation_fee = null;
    } else {
      payload.consultation_fee = Number(payload.consultation_fee);
    }
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

  const handleExport = async () => {
    setExporting(true);
    setError("");
    setImportResult(null);
    try {
      const params = {};
      if (isSuperAdmin && filterCompanyId) {
        params.company_id = filterCompanyId;
      }
      if (filterBranchId) {
        params.branch_id = filterBranchId;
      }
      await exportDoctors(params);
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    if (isSuperAdmin && !filterCompanyId) {
      setError("Select a clinic before importing doctors.");
      return;
    }
    importInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (isSuperAdmin && !filterCompanyId) {
      setError("Select a clinic before importing doctors.");
      return;
    }

    setImporting(true);
    setError("");
    setImportResult(null);
    try {
      const { data } = await importDoctors(file, isSuperAdmin ? filterCompanyId : undefined);
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
      await downloadDoctorSample();
    } catch (err) {
      setError(err.message || "Could not download sample file.");
    } finally {
      setDownloadingSample(false);
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
          <span>{loading ? "Loading…" : `${filteredItems.length} doctor(s)`}</span>
          <input
            type="search"
            className="crud-search-input"
            placeholder="Search by name or mobile number…"
            aria-label="Search doctors by name or mobile number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {isSuperAdmin && (
            <CompanySelect
              variant="inline"
              allowAll
              label="Filter clinic"
              id="doctor_filter_company_id"
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              required={false}
            />
          )}
          <BranchSelect
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            allLabel="All branches"
            id="doctor_branch_filter"
            name="branch_filter"
          />
        </div>
        {!isDoctor && (
          <div className="crud-toolbar-actions">
            <button
              type="button"
              className="crud-btn crud-btn--export"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? "Exporting…" : "Export Excel"}
            </button>
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
                title="Download .xls sample with required columns: name, email, department"
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
            <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
              Add doctor
            </button>
          </div>
        )}
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

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={6} className="crud-empty">
                  {items.length === 0
                    ? "No doctors yet. Add one or import an Excel file."
                    : "No doctors match your search."}
                </td>
              </tr>
            )}
            {filteredItems.map((doctor) => (
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
              <label htmlFor="name">Full name *</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Enter full name" />
            </div>
            <div className="crud-field">
              <label htmlFor="email">Email *</label>
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
              <label htmlFor="department_id">Department / speciality *</label>
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
              <label htmlFor="phone">Phone *</label>
              <input id="phone" name="phone" value={form.phone} onChange={handleChange} required placeholder="Enter phone number" />
            </div>
            <div className="crud-field">
              <label htmlFor="password">
                {editing ? "Password (leave blank to keep)" : "Password *"}
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
              <label htmlFor="qualification">Qualification *</label>
              <input
                id="qualification"
                name="qualification"
                value={form.qualification}
                onChange={handleChange}
                required
                placeholder="Enter qualification"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="experience_years">Experience (years) *</label>
              <input
                id="experience_years"
                name="experience_years"
                type="number"
                min="0"
                value={form.experience_years}
                onChange={handleChange}
                required
                placeholder="Years of experience"
              />
            </div>
            <div className="crud-field">
              <label htmlFor="license_number">License number</label>
              <input
                id="license_number"
                name="license_number"
                value={form.license_number}
                onChange={handleChange}
                placeholder="Enter license number"
              />
            </div>
            {!hideConsultationFee && (
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
                  placeholder="Enter amount"
                />
              </div>
            )}
            <div className="crud-field crud-field--full">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" name="bio" value={form.bio} onChange={handleChange} placeholder="Enter bio (optional)" />
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
