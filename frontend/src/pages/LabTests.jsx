import { useCallback, useEffect, useState } from "react";
import {
  getLabCategories, createLabCategory, updateLabCategory, deleteLabCategory,
  getLabTests, createLabTest, updateLabTest, deleteLabTest,
  getLabPackages, createLabPackage, updateLabPackage, deleteLabPackage,
} from "../api/lab";
import Modal from "../components/crud/Modal";
import CompanySelect from "../components/CompanySelect";
import { useAuth } from "../auth/AuthContext";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./LabTests.css";

const SAMPLE_TYPES = ["blood", "urine", "stool", "swab", "sputum", "other"];
const TABS = ["Categories", "Tests", "Packages"];

const emptyCategory = { company_id: "", name: "", description: "", sort_order: 0, is_active: true };
const emptyTest = {
  company_id: "", category_id: "", name: "", code: "", sample_type: "blood",
  price: "", turnaround_hours: 24, unit: "",
  ref_range_male: "", ref_range_female: "", ref_range_child: "",
  method: "", description: "", is_active: true,
};
const emptyPackage = { company_id: "", name: "", code: "", description: "", price: "", turnaround_hours: 24, is_active: true, test_ids: [] };

function LabTests() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState("Categories");
  const [categories, setCategories] = useState([]);
  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyCategory);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catRes, testRes, pkgRes] = await Promise.all([
        getLabCategories(),
        getLabTests(),
        getLabPackages(),
      ]);
      setCategories(catRes.data);
      setTests(testRes.data);
      setPackages(pkgRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load lab data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const emptyForTab = () => {
    if (tab === "Categories") return emptyCategory;
    if (tab === "Tests") return emptyTest;
    return emptyPackage;
  };

  const openCreate = () => { setEditing(null); setForm(emptyForTab()); setModalOpen(true); };

  const openEdit = (row) => {
    setEditing(row);
    const cid = String(row.company_id || "");
    if (tab === "Categories") {
      setForm({ company_id: cid, name: row.name || "", description: row.description || "", sort_order: row.sort_order || 0, is_active: Boolean(row.is_active) });
    } else if (tab === "Tests") {
      setForm({
        company_id: cid, category_id: row.category_id || "", name: row.name || "", code: row.code || "",
        sample_type: row.sample_type || "blood", price: row.price || "",
        turnaround_hours: row.turnaround_hours || 24, unit: row.unit || "",
        ref_range_male: row.ref_range_male || "", ref_range_female: row.ref_range_female || "",
        ref_range_child: row.ref_range_child || "", method: row.method || "",
        description: row.description || "", is_active: Boolean(row.is_active),
      });
    } else {
      setForm({
        company_id: cid, name: row.name || "", code: row.code || "", description: row.description || "",
        price: row.price || "", turnaround_hours: row.turnaround_hours || 24,
        is_active: Boolean(row.is_active),
        test_ids: row.tests?.map((t) => t.id) || [],
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleTestIdToggle = (id) => {
    setForm((prev) => {
      const ids = prev.test_ids.includes(id)
        ? prev.test_ids.filter((x) => x !== id)
        : [...prev.test_ids, id];
      return { ...prev, test_ids: ids };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (tab === "Categories") {
        editing ? await updateLabCategory(editing.id, form) : await createLabCategory(form);
      } else if (tab === "Tests") {
        editing ? await updateLabTest(editing.id, form) : await createLabTest(form);
      } else {
        editing ? await updateLabPackage(editing.id, form) : await createLabPackage(form);
      }
      closeModal();
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    try {
      if (tab === "Categories") await deleteLabCategory(row.id);
      else if (tab === "Tests") await deleteLabTest(row.id);
      else await deleteLabPackage(row.id);
      await loadAll();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete."));
    }
  };

  const getCategoryName = (id) => categories.find((c) => c.id === Number(id))?.name || "—";

  const modalTitle = () => {
    const action = editing ? "Edit" : "Add";
    if (tab === "Categories") return `${action} category`;
    if (tab === "Tests") return `${action} test`;
    return `${action} package`;
  };

  return (
    <section className="page-card lab-tests-page">
      <div className="page-card-header">
        <h2>Lab Test Catalog</h2>
        <p>Manage test categories, individual tests, and test packages.</p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="lab-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`lab-tab ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
            <span className="lab-tab-count">
              {t === "Categories" ? categories.length : t === "Tests" ? tests.length : packages.length}
            </span>
          </button>
        ))}
      </div>

      <div className="crud-toolbar">
        <span>{loading ? "Loading…" : ""}</span>
        <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
          Add {tab === "Categories" ? "category" : tab === "Tests" ? "test" : "package"}
        </button>
      </div>

      {/* ── CATEGORIES ── */}
      {tab === "Categories" && (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Description</th><th>Tests</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {!loading && categories.length === 0 && (
                <tr><td colSpan={6} className="crud-empty">No categories yet. Add Haematology, Biochemistry, etc.</td></tr>
              )}
              {categories.map((row) => (
                <tr key={row.id}>
                  <td className="lab-sort">{row.sort_order}</td>
                  <td><strong>{row.name}</strong></td>
                  <td>{row.description || "—"}</td>
                  <td>{row.tests?.length ?? 0} test(s)</td>
                  <td><span className={`crud-badge ${row.is_active ? "crud-badge--active" : "crud-badge--inactive"}`}>{row.is_active ? "Active" : "Inactive"}</span></td>
                  <td><div className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleDelete(row)}>Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TESTS ── */}
      {tab === "Tests" && (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr><th>Name</th><th>Category</th><th>Sample</th><th>Price</th><th>TAT</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {!loading && tests.length === 0 && (
                <tr><td colSpan={7} className="crud-empty">No tests yet. Add CBC, Blood Sugar, etc.</td></tr>
              )}
              {tests.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    {row.code && <span className="lab-code"> ({row.code})</span>}
                  </td>
                  <td>{row.category?.name || getCategoryName(row.category_id)}</td>
                  <td><span className={`lab-sample-badge lab-sample-${row.sample_type}`}>{row.sample_type}</span></td>
                  <td>₹{Number(row.price).toLocaleString("en-IN")}</td>
                  <td>{row.turnaround_hours}h</td>
                  <td><span className={`crud-badge ${row.is_active ? "crud-badge--active" : "crud-badge--inactive"}`}>{row.is_active ? "Active" : "Inactive"}</span></td>
                  <td><div className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleDelete(row)}>Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PACKAGES ── */}
      {tab === "Packages" && (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr><th>Package name</th><th>Tests included</th><th>Price</th><th>TAT</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {!loading && packages.length === 0 && (
                <tr><td colSpan={6} className="crud-empty">No packages yet. Add Complete Blood Count, Full Body Checkup, etc.</td></tr>
              )}
              {packages.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    {row.code && <span className="lab-code"> ({row.code})</span>}
                  </td>
                  <td>{row.tests?.map((t) => t.name).join(", ") || "—"}</td>
                  <td>₹{Number(row.price).toLocaleString("en-IN")}</td>
                  <td>{row.turnaround_hours}h</td>
                  <td><span className={`crud-badge ${row.is_active ? "crud-badge--active" : "crud-badge--inactive"}`}>{row.is_active ? "Active" : "Inactive"}</span></td>
                  <td><div className="crud-actions">
                    <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openEdit(row)}>Edit</button>
                    <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleDelete(row)}>Delete</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL ── */}
      <Modal title={modalTitle()} open={modalOpen} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">

            {/* Category form */}
            {tab === "Categories" && (
              <>
                {isSuperAdmin && (
                  <div className="crud-field crud-field--full">
                    <label>Organization *</label>
                    <CompanySelect name="company_id" value={form.company_id} onChange={handleChange} required />
                  </div>
                )}
                <div className="crud-field crud-field--full">
                  <label htmlFor="cat_name">Category name *</label>
                  <input id="cat_name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Haematology" />
                </div>
                <div className="crud-field crud-field--full">
                  <label htmlFor="cat_desc">Description</label>
                  <textarea id="cat_desc" name="description" value={form.description} onChange={handleChange} />
                </div>
                <div className="crud-field">
                  <label htmlFor="cat_sort">Sort order</label>
                  <input id="cat_sort" name="sort_order" type="number" value={form.sort_order} onChange={handleChange} />
                </div>
                <div className="crud-field">
                  <label className="crud-checkbox"><input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} /> Active</label>
                </div>
              </>
            )}

            {/* Test form */}
            {tab === "Tests" && (
              <>
                {isSuperAdmin && (
                  <div className="crud-field crud-field--full">
                    <label>Organization *</label>
                    <CompanySelect name="company_id" value={form.company_id} onChange={handleChange} required />
                  </div>
                )}
                <div className="crud-field">
                  <label htmlFor="test_name">Test name *</label>
                  <input id="test_name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Complete Blood Count" />
                </div>
                <div className="crud-field">
                  <label htmlFor="test_code">Code</label>
                  <input id="test_code" name="code" value={form.code} onChange={handleChange} placeholder="e.g. CBC" />
                </div>
                <div className="crud-field">
                  <label htmlFor="test_category">Category *</label>
                  <select id="test_category" name="category_id" value={form.category_id} onChange={handleChange} required>
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="crud-field">
                  <label htmlFor="test_sample">Sample type *</label>
                  <select id="test_sample" name="sample_type" value={form.sample_type} onChange={handleChange}>
                    {SAMPLE_TYPES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="crud-field">
                  <label htmlFor="test_price">Price (₹) *</label>
                  <input id="test_price" name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required />
                </div>
                <div className="crud-field">
                  <label htmlFor="test_tat">Turnaround (hours)</label>
                  <input id="test_tat" name="turnaround_hours" type="number" min="1" value={form.turnaround_hours} onChange={handleChange} />
                </div>
                <div className="crud-field">
                  <label htmlFor="test_unit">Unit</label>
                  <input id="test_unit" name="unit" value={form.unit} onChange={handleChange} placeholder="e.g. mg/dL" />
                </div>
                <div className="crud-field">
                  <label htmlFor="test_method">Method</label>
                  <input id="test_method" name="method" value={form.method} onChange={handleChange} placeholder="e.g. ELISA" />
                </div>
                <div className="crud-field">
                  <label htmlFor="test_ref_m">Ref range (Male)</label>
                  <input id="test_ref_m" name="ref_range_male" value={form.ref_range_male} onChange={handleChange} placeholder="e.g. 4.5-5.9" />
                </div>
                <div className="crud-field">
                  <label htmlFor="test_ref_f">Ref range (Female)</label>
                  <input id="test_ref_f" name="ref_range_female" value={form.ref_range_female} onChange={handleChange} placeholder="e.g. 4.0-5.2" />
                </div>
                <div className="crud-field">
                  <label htmlFor="test_ref_c">Ref range (Child)</label>
                  <input id="test_ref_c" name="ref_range_child" value={form.ref_range_child} onChange={handleChange} />
                </div>
                <div className="crud-field">
                  <label className="crud-checkbox"><input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} /> Active</label>
                </div>
                <div className="crud-field crud-field--full">
                  <label htmlFor="test_desc">Description</label>
                  <textarea id="test_desc" name="description" value={form.description} onChange={handleChange} />
                </div>
              </>
            )}

            {/* Package form */}
            {tab === "Packages" && (
              <>
                {isSuperAdmin && (
                  <div className="crud-field crud-field--full">
                    <label>Organization *</label>
                    <CompanySelect name="company_id" value={form.company_id} onChange={handleChange} required />
                  </div>
                )}
                <div className="crud-field">
                  <label htmlFor="pkg_name">Package name *</label>
                  <input id="pkg_name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Full Body Checkup" />
                </div>
                <div className="crud-field">
                  <label htmlFor="pkg_code">Code</label>
                  <input id="pkg_code" name="code" value={form.code} onChange={handleChange} />
                </div>
                <div className="crud-field">
                  <label htmlFor="pkg_price">Price (₹) *</label>
                  <input id="pkg_price" name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required />
                </div>
                <div className="crud-field">
                  <label htmlFor="pkg_tat">Turnaround (hours)</label>
                  <input id="pkg_tat" name="turnaround_hours" type="number" min="1" value={form.turnaround_hours} onChange={handleChange} />
                </div>
                <div className="crud-field crud-field--full">
                  <label htmlFor="pkg_desc">Description</label>
                  <textarea id="pkg_desc" name="description" value={form.description} onChange={handleChange} />
                </div>
                <div className="crud-field crud-field--full">
                  <label>Include tests</label>
                  <div className="lab-test-checklist">
                    {tests.filter((t) => t.is_active).map((t) => (
                      <label key={t.id} className="lab-test-check-item">
                        <input
                          type="checkbox"
                          checked={form.test_ids.includes(t.id)}
                          onChange={() => handleTestIdToggle(t.id)}
                        />
                        <span>{t.name}</span>
                        <span className="lab-code">{t.category?.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="crud-field">
                  <label className="crud-checkbox"><input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} /> Active</label>
                </div>
              </>
            )}
          </div>

          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={closeModal}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default LabTests;
