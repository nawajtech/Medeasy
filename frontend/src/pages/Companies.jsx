import { useCallback, useEffect, useRef, useState } from "react";
import "../App.css";
import { createCompany, deleteCompany, getCompanies, updateCompany } from "../api/companies";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Companies.css";

const COMPANY_TYPES = [
  { value: "clinic",            label: "Clinic" },
  { value: "diagnostic_center", label: "Diagnostic Center" },
  { value: "pathology_lab",     label: "Pathology Lab" },
  { value: "hospital",          label: "Hospital" },
  { value: "pharmacy",          label: "Pharmacy" },
];

const emptyForm = {
  name: "",
  code: "",
  type: "clinic",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "",
  website: "",
  gst_number: "",
  registration_number: "",
  currency: "INR",
  description: "",
  is_active: true,
  logo_base64: "",   // base64 data URI of chosen file
};

/** Convert a File object to a base64 data URI */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Front-end field validation — returns object of { field: message } */
function validate(form, isCreate) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Organization name is required.";
  if (!form.type) errors.type = "Organization type is required.";
  if (!form.phone.trim()) errors.phone = "Phone is required.";
  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address.";
  if (!form.address.trim()) errors.address = "Address is required.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!form.country.trim()) errors.country = "Country is required.";
  if (isCreate && !form.logo_base64) errors.logo = "Logo is required for every organization.";
  if (form.website && !/^https?:\/\/.+/.test(form.website)) errors.website = "Must be a valid URL (http/https).";
  return errors;
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <span className="company-field-error">{msg}</span>;
}

function Companies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");  // URL for <img> preview
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getCompanies();
      setItems(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load companies."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setLogoPreview("");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name:                row.name || "",
      code:                row.code || "",
      type:                row.type || "clinic",
      phone:               row.phone || "",
      email:               row.email || "",
      address:             row.address || "",
      city:                row.city || "",
      state:               row.state || "",
      country:             row.country || "",
      website:             row.website || "",
      gst_number:          row.gst_number || "",
      registration_number: row.registration_number || "",
      currency:            row.currency || "INR",
      description:         row.description || "",
      is_active:           Boolean(row.is_active),
      logo_base64:         "",   // don't re-send existing logo unless changed
    });
    setFieldErrors({});
    setLogoPreview(row.logo_url || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setLogoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check — max 2 MB
    if (file.size > 2 * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, logo: "Logo must be under 2 MB." }));
      e.target.value = "";
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setFieldErrors((prev) => ({ ...prev, logo: "Only JPG, PNG, GIF, WEBP or SVG allowed." }));
      e.target.value = "";
      return;
    }

    const base64 = await fileToBase64(file);
    setForm((prev) => ({ ...prev, logo_base64: base64 }));
    setLogoPreview(base64);
    setFieldErrors((prev) => ({ ...prev, logo: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate(form, !editing);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateCompany(editing.id, form);
      } else {
        await createCompany(form);
      }
      closeModal();
      await load();
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to save company.");
      // Try to surface field-level Laravel errors
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors) {
        const mapped = {};
        for (const [field, msgs] of Object.entries(serverErrors)) {
          mapped[field === "logo_base64" ? "logo" : field] = Array.isArray(msgs) ? msgs[0] : msgs;
        }
        setFieldErrors(mapped);
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    setError("");
    try {
      await deleteCompany(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete company."));
    }
  };

  const location = (row) => {
    const parts = [row.city, row.state, row.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  };

  const req = (label) => (
    <>
      {label} <span className="company-required" aria-hidden="true">*</span>
    </>
  );

  return (
    <section className="page-card companies-page">
      <div className="page-card-header">
        <h2>Organizations</h2>
        <p>Manage clinics, labs, diagnostic centers, hospitals, and pharmacies on the platform.</p>
      </div>

      <div className="crud-toolbar">
        <span>{loading ? "Loading…" : `${items.length} organization(s)`}</span>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          Add organization
        </button>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Organization</th>
              <th>Type</th>
              <th>Phone</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="crud-empty">No organizations yet. Add your first one.</td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.logo_url
                    ? <img src={row.logo_url} alt={row.name} className="company-logo-thumb" />
                    : <span className="company-logo-placeholder">{row.name.charAt(0).toUpperCase()}</span>
                  }
                </td>
                <td>
                  <strong>{row.name}</strong>
                  {row.code && <span className="company-code"> ({row.code})</span>}
                </td>
                <td>
                  <span className={`crud-badge crud-badge--type-${row.type || "clinic"}`}>
                    {COMPANY_TYPES.find((t) => t.value === row.type)?.label || "Clinic"}
                  </span>
                </td>
                <td>{row.phone || "—"}</td>
                <td>{location(row)}</td>
                <td>
                  <span className={`crud-badge ${row.is_active ? "crud-badge--active" : "crud-badge--inactive"}`}>
                    {row.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <div className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleDelete(row)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Modal ── */}
      <Modal
        title={editing ? `Edit — ${editing.name}` : "Add organization"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} noValidate>
          {/* ── Logo upload ── */}
          <div className="company-logo-upload-area">
            {logoPreview
              ? <img src={logoPreview} alt="Logo preview" className="company-logo-preview" />
              : (
                <div className="company-logo-placeholder-lg">
                  <span>No logo</span>
                </div>
              )
            }
            <div className="company-logo-upload-info">
              <label htmlFor="company_logo" className="crud-btn crud-btn--ghost">
                {logoPreview ? "Change logo" : "Upload logo"}
              </label>
              <input
                ref={fileInputRef}
                id="company_logo"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                className="company-logo-file-input"
              />
              <p className="company-logo-hint">
                {editing ? "Leave unchanged to keep existing logo." : "Required. JPG, PNG, SVG · Max 2 MB"}
              </p>
              <FieldError msg={fieldErrors.logo} />
            </div>
          </div>

          <div className="crud-form-grid">
            {/* Organization name */}
            <div className="crud-field">
              <label htmlFor="co_name">{req("Organization name")}</label>
              <input
                id="co_name" name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Apollo Clinic" className={fieldErrors.name ? "is-error" : ""}
              />
              <FieldError msg={fieldErrors.name} />
            </div>

            {/* Type */}
            <div className="crud-field">
              <label htmlFor="co_type">{req("Type")}</label>
              <select id="co_type" name="type" value={form.type} onChange={handleChange}
                className={fieldErrors.type ? "is-error" : ""}>
                {COMPANY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <FieldError msg={fieldErrors.type} />
            </div>

            {/* Short code */}
            <div className="crud-field">
              <label htmlFor="co_code">Short code</label>
              <input
                id="co_code" name="code" value={form.code} onChange={handleChange}
                placeholder="e.g. APOLLO"
              />
            </div>

            {/* Currency */}
            <div className="crud-field">
              <label htmlFor="co_currency">{req("Currency")}</label>
              <select id="co_currency" name="currency" value={form.currency} onChange={handleChange}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            {/* Phone */}
            <div className="crud-field">
              <label htmlFor="co_phone">{req("Phone")}</label>
              <input
                id="co_phone" name="phone" value={form.phone} onChange={handleChange}
                placeholder="+91 98765 43210" className={fieldErrors.phone ? "is-error" : ""}
              />
              <FieldError msg={fieldErrors.phone} />
            </div>

            {/* Email */}
            <div className="crud-field">
              <label htmlFor="co_email">{req("Email")}</label>
              <input
                id="co_email" name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="info@example.com" className={fieldErrors.email ? "is-error" : ""}
              />
              <FieldError msg={fieldErrors.email} />
            </div>

            {/* Address */}
            <div className="crud-field crud-field--full">
              <label htmlFor="co_address">{req("Address")}</label>
              <input
                id="co_address" name="address" value={form.address} onChange={handleChange}
                placeholder="Street / building" className={fieldErrors.address ? "is-error" : ""}
              />
              <FieldError msg={fieldErrors.address} />
            </div>

            {/* City */}
            <div className="crud-field">
              <label htmlFor="co_city">{req("City")}</label>
              <input
                id="co_city" name="city" value={form.city} onChange={handleChange}
                placeholder="e.g. Mumbai" className={fieldErrors.city ? "is-error" : ""}
              />
              <FieldError msg={fieldErrors.city} />
            </div>

            {/* State */}
            <div className="crud-field">
              <label htmlFor="co_state">State / Province</label>
              <input id="co_state" name="state" value={form.state} onChange={handleChange} />
            </div>

            {/* Country */}
            <div className="crud-field">
              <label htmlFor="co_country">{req("Country")}</label>
              <input
                id="co_country" name="country" value={form.country} onChange={handleChange}
                placeholder="e.g. India" className={fieldErrors.country ? "is-error" : ""}
              />
              <FieldError msg={fieldErrors.country} />
            </div>

            {/* Website */}
            <div className="crud-field">
              <label htmlFor="co_website">Website</label>
              <input
                id="co_website" name="website" value={form.website} onChange={handleChange}
                placeholder="https://example.com" className={fieldErrors.website ? "is-error" : ""}
              />
              <FieldError msg={fieldErrors.website} />
            </div>

            {/* GST */}
            <div className="crud-field">
              <label htmlFor="co_gst">GST number</label>
              <input id="co_gst" name="gst_number" value={form.gst_number} onChange={handleChange} placeholder="22AAAAA0000A1Z5" />
            </div>

            {/* Registration */}
            <div className="crud-field">
              <label htmlFor="co_reg">Registration no.</label>
              <input id="co_reg" name="registration_number" value={form.registration_number} onChange={handleChange} />
            </div>

            {/* Description */}
            <div className="crud-field crud-field--full">
              <label htmlFor="co_desc">Description</label>
              <textarea id="co_desc" name="description" value={form.description} onChange={handleChange} rows={3} />
            </div>

            {/* Active */}
            <div className="crud-field crud-checkbox">
              <label>
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                Active
              </label>
            </div>
          </div>

          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={closeModal}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update organization" : "Create organization"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default Companies;
