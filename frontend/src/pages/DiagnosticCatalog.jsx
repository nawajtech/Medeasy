import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDiagnosticCategories, createDiagnosticCategory, updateDiagnosticCategory, deleteDiagnosticCategory,
  getDiagnosticTypes, createDiagnosticType, updateDiagnosticType, deleteDiagnosticType,
} from "../api/diagnostics";
import { getDoctors } from "../api/doctors";
import Modal from "../components/crud/Modal";
import CompanySelect from "../components/CompanySelect";
import { useAuth } from "../auth/AuthContext";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import { withCompanyScope } from "../utils/tenantPayload";
import "./DiagnosticOrders.css";

const CATALOG_TABS = ["Categories", "Tests"];

const emptyCategory = { company_id: "", name: "", description: "", sort_order: 0, is_active: true };
const emptyTest = {
  company_id: "", category_id: "", name: "", code: "", price: "", referral_commission: "", doctor_commission: "",
  description: "", preparation_instructions: "", is_active: true, doctor_ids: [],
};

function DiagnosticCatalog() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState("Categories");
  const [categories, setCategories] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [testForm, setTestForm] = useState(emptyTest);
  const [doctors, setDoctors] = useState([]);

  const loadDoctors = useCallback(async (companyId = "") => {
    try {
      const params = companyId ? { company_id: companyId } : {};
      const { data } = await getDoctors(params);
      setDoctors(data || []);
    } catch {
      setDoctors([]);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catRes, typeRes] = await Promise.all([
        getDiagnosticCategories(),
        getDiagnosticTypes(),
      ]);
      setCategories(catRes.data);
      setTypes(typeRes.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load diagnostic catalog."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadDoctors();
  }, [loadCatalog, loadDoctors]);

  const testsByCategory = useMemo(() => {
    const map = new Map();
    for (const cat of categories) {
      map.set(cat.id, { category: cat, tests: [] });
    }
    for (const test of types) {
      const key = test.category_id;
      if (!map.has(key)) {
        map.set(key, {
          category: test.category || { id: key, name: "Uncategorized" },
          tests: [],
        });
      }
      map.get(key).tests.push(test);
    }
    return [...map.values()].sort(
      (a, b) => (a.category.sort_order ?? 0) - (b.category.sort_order ?? 0)
        || String(a.category.name).localeCompare(String(b.category.name))
    );
  }, [categories, types]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.is_active),
    [categories]
  );

  const openCategoryCreate = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategory);
    setCatModalOpen(true);
  };

  const openCategoryEdit = (row) => {
    setEditingCategory(row);
    setCategoryForm({
      company_id: String(row.company_id || ""),
      name: row.name || "",
      description: row.description || "",
      sort_order: row.sort_order || 0,
      is_active: Boolean(row.is_active),
    });
    setCatModalOpen(true);
  };

  const handleCategorySave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingCategory) {
        await updateDiagnosticCategory(editingCategory.id, withCompanyScope(categoryForm, isSuperAdmin));
      } else {
        await createDiagnosticCategory(withCompanyScope(categoryForm, isSuperAdmin));
      }
      setCatModalOpen(false);
      await loadCatalog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save category."));
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryDelete = async (row) => {
    if (!window.confirm(`Delete category "${row.name}"?`)) return;
    try {
      await deleteDiagnosticCategory(row.id);
      await loadCatalog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete category."));
    }
  };

  const openTestCreate = () => {
    setEditingTest(null);
    setTestForm({
      ...emptyTest,
      category_id: activeCategories[0]?.id ? String(activeCategories[0].id) : "",
    });
    setTestModalOpen(true);
    loadDoctors(testForm.company_id || "");
  };

  const openTestEdit = (row) => {
    setEditingTest(row);
    setTestForm({
      company_id: String(row.company_id || ""),
      category_id: String(row.category_id || ""),
      name: row.name || "",
      code: row.code || "",
      price: row.price || "",
      referral_commission: row.referral_commission ?? "",
      doctor_commission: row.doctor_commission ?? "",
      description: row.description || "",
      preparation_instructions: row.preparation_instructions || "",
      is_active: Boolean(row.is_active),
      doctor_ids: (row.doctors || []).map((d) => d.id),
    });
    setTestModalOpen(true);
    loadDoctors(String(row.company_id || ""));
  };

  const handleTestCompanyChange = (e) => {
    const cid = e.target.value;
    setTestForm((p) => ({ ...p, company_id: cid, doctor_ids: [] }));
    loadDoctors(cid);
  };

  const toggleTestDoctor = (doctorId) => {
    setTestForm((prev) => {
      const set = new Set(prev.doctor_ids || []);
      if (set.has(doctorId)) set.delete(doctorId);
      else set.add(doctorId);
      return { ...prev, doctor_ids: [...set] };
    });
  };

  const handleTestSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingTest) {
        await updateDiagnosticType(editingTest.id, withCompanyScope(testForm, isSuperAdmin));
      } else {
        await createDiagnosticType(withCompanyScope(testForm, isSuperAdmin));
      }
      setTestModalOpen(false);
      await loadCatalog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save test."));
    } finally {
      setSaving(false);
    }
  };

  const handleTestDelete = async (row) => {
    if (!window.confirm(`Delete test "${row.name}"?`)) return;
    try {
      await deleteDiagnosticType(row.id);
      await loadCatalog();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete test."));
    }
  };

  return (
    <section className="page-card dgn-page">
      <div className="page-card-header">
        <h2>Diagnostic Catalog</h2>
        <p>Set up categories first (e.g. Homeopathy), then add tests under each category (e.g. Blood Test).</p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="lab-tabs">
        {CATALOG_TABS.map((t) => (
          <button key={t} type="button" className={`lab-tab ${tab === t ? "is-active" : ""}`} onClick={() => setTab(t)}>
            {t}
            <span className="lab-tab-count">
              {t === "Categories" ? categories.length : types.length}
            </span>
          </button>
        ))}
      </div>

      {tab === "Categories" && (
        <>
          <div className="crud-toolbar">
            <span>{loading ? "Loading…" : `${categories.length} category(ies)`}</span>
            <button type="button" className="crud-btn crud-btn--primary" onClick={openCategoryCreate}>Add category</button>
          </div>
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead><tr><th>Name</th><th>Tests</th><th>Sort</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {!loading && categories.length === 0 && (
                  <tr><td colSpan={5} className="crud-empty">No categories yet. Add Homeopathy, Pathology, etc.</td></tr>
                )}
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong>{c.description && <div className="dgn-cat-desc">{c.description}</div>}</td>
                    <td>{types.filter((t) => t.category_id === c.id).length}</td>
                    <td>{c.sort_order}</td>
                    <td><span className={`crud-badge ${c.is_active ? "crud-badge--active" : "crud-badge--inactive"}`}>{c.is_active ? "Active" : "Inactive"}</span></td>
                    <td>
                      <div className="crud-actions">
                        <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openCategoryEdit(c)}>Edit</button>
                        <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleCategoryDelete(c)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "Tests" && (
        <>
          <div className="crud-toolbar">
            <span>{loading ? "Loading…" : `${types.length} test(s)`}</span>
            <button type="button" className="crud-btn crud-btn--primary" onClick={openTestCreate} disabled={!activeCategories.length}>
              Add test
            </button>
          </div>
          {!activeCategories.length && (
            <div className="crud-alert">Create at least one category before adding tests.</div>
          )}
          {testsByCategory.map(({ category, tests }) => (
            <div key={category.id} className="dgn-category-block">
              <h3 className="dgn-category-title">{category.name}</h3>
              {tests.length === 0 ? (
                <p className="crud-empty">No tests in this category.</p>
              ) : (
                <div className="crud-table-wrap">
                  <table className="crud-table">
                    <thead><tr><th>Test name</th><th>Code</th><th>Doctors</th><th>Price</th><th>Referral comm.</th><th>Doctor comm.</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {tests.map((t) => (
                        <tr key={t.id}>
                          <td><strong>{t.name}</strong></td>
                          <td>{t.code || "—"}</td>
                          <td>
                            {(t.doctors || []).length
                              ? (t.doctors || []).map((d) => d.user?.name || `Doctor #${d.id}`).join(", ")
                              : "—"}
                          </td>
                          <td>₹{Number(t.price).toLocaleString("en-IN")}</td>
                          <td>{Number(t.referral_commission || 0) > 0 ? `₹${Number(t.referral_commission).toLocaleString("en-IN")}` : "—"}</td>
                          <td>{Number(t.doctor_commission || 0) > 0 ? `₹${Number(t.doctor_commission).toLocaleString("en-IN")}` : "—"}</td>
                          <td><span className={`crud-badge ${t.is_active ? "crud-badge--active" : "crud-badge--inactive"}`}>{t.is_active ? "Active" : "Inactive"}</span></td>
                          <td>
                            <div className="crud-actions">
                              <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => openTestEdit(t)}>Edit</button>
                              <button type="button" className="crud-btn crud-btn--danger crud-btn--sm" onClick={() => handleTestDelete(t)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      <Modal title={editingCategory ? "Edit category" : "Add category"} open={catModalOpen} onClose={() => setCatModalOpen(false)}>
        <form onSubmit={handleCategorySave}>
          <div className="crud-form-grid">
            {isSuperAdmin && (
              <div className="crud-field crud-field--full">
                <label>Organization *</label>
                <CompanySelect name="company_id" value={categoryForm.company_id} onChange={(e) => setCategoryForm((p) => ({ ...p, company_id: e.target.value }))} required />
              </div>
            )}
            <div className="crud-field">
              <label>Category name *</label>
              <input name="name" value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} required placeholder="e.g. Homeopathy" />
            </div>
            <div className="crud-field">
              <label>Sort order</label>
              <input type="number" name="sort_order" value={categoryForm.sort_order} onChange={(e) => setCategoryForm((p) => ({ ...p, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="crud-field crud-field--full">
              <label>Description</label>
              <textarea name="description" value={categoryForm.description} onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="crud-field">
              <label className="crud-checkbox"><input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm((p) => ({ ...p, is_active: e.target.checked }))} /> Active</label>
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setCatModalOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>

      <Modal title={editingTest ? "Edit test" : "Add test"} open={testModalOpen} onClose={() => setTestModalOpen(false)}>
        <form onSubmit={handleTestSave}>
          <div className="crud-form-grid">
            {isSuperAdmin && (
              <div className="crud-field crud-field--full">
                <label>Organization *</label>
                <CompanySelect name="company_id" value={testForm.company_id} onChange={handleTestCompanyChange} required />
              </div>
            )}
            <div className="crud-field crud-field--full">
              <label>Category *</label>
              <select name="category_id" value={testForm.category_id} onChange={(e) => setTestForm((p) => ({ ...p, category_id: e.target.value }))} required>
                <option value="">Select category</option>
                {categories.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="crud-field">
              <label>Test name *</label>
              <input name="name" value={testForm.name} onChange={(e) => setTestForm((p) => ({ ...p, name: e.target.value }))} required placeholder="e.g. Blood Test" />
            </div>
            <div className="crud-field">
              <label>Code</label>
              <input name="code" value={testForm.code} onChange={(e) => setTestForm((p) => ({ ...p, code: e.target.value }))} placeholder="e.g. BT-001" />
            </div>
            <div className="crud-field crud-field--full">
              <label>Assigned doctors</label>
              {!doctors.length ? (
                <p className="company-modules-hint">No doctors found — add doctors under Diagnostics first.</p>
              ) : (
                <div className="dgn-doctor-picks">
                  {doctors.map((d) => (
                    <label key={d.id} className="crud-checkbox dgn-doctor-pick">
                      <input
                        type="checkbox"
                        checked={(testForm.doctor_ids || []).includes(d.id)}
                        onChange={() => toggleTestDoctor(d.id)}
                      />
                      {d.user?.name || `Doctor #${d.id}`}
                      {d.department?.name ? ` (${d.department.name})` : ""}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="crud-field">
              <label>Price (₹) *</label>
              <input type="number" min="0" step="0.01" name="price" value={testForm.price} onChange={(e) => setTestForm((p) => ({ ...p, price: e.target.value }))} required />
            </div>
            <div className="crud-field">
              <label>Referral commission (₹)</label>
              <input type="number" min="0" step="0.01" name="referral_commission" value={testForm.referral_commission} onChange={(e) => setTestForm((p) => ({ ...p, referral_commission: e.target.value }))} placeholder="Normal commission for all partners" />
            </div>
            <div className="crud-field">
              <label>Doctor commission (₹)</label>
              <input type="number" min="0" step="0.01" name="doctor_commission" value={testForm.doctor_commission} onChange={(e) => setTestForm((p) => ({ ...p, doctor_commission: e.target.value }))} placeholder="Per-order doctor share" />
            </div>
            <div className="crud-field crud-field--full">
              <label>Preparation instructions</label>
              <textarea value={testForm.preparation_instructions} onChange={(e) => setTestForm((p) => ({ ...p, preparation_instructions: e.target.value }))} />
            </div>
            <div className="crud-field">
              <label className="crud-checkbox"><input type="checkbox" checked={testForm.is_active} onChange={(e) => setTestForm((p) => ({ ...p, is_active: e.target.checked }))} /> Active</label>
            </div>
          </div>
          <div className="crud-modal-actions">
            <button type="button" className="crud-btn crud-btn--ghost" onClick={() => setTestModalOpen(false)}>Cancel</button>
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default DiagnosticCatalog;
