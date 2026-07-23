import { useCallback, useEffect, useRef, useState } from "react";
import "../App.css";
import {
  createMedicine,
  deleteMedicine,
  exportMedicines,
  getMedicines,
  importMedicines,
  updateMedicine,
} from "../api/medicines";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Medicines.css";

const emptyForm = {
  name: "",
  manufacturer_name: "",
  composition: "",
};

function Medicines() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, last_page: 1, per_page: 50 });
  const importInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, per_page: 50 };
      if (search.trim()) params.search = search.trim();
      const { data } = await getMedicines(params);
      setItems(data.data || []);
      setPagination({
        total: data.total ?? 0,
        last_page: data.last_page ?? 1,
        per_page: data.per_page ?? 50,
        current_page: data.current_page ?? 1,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load medicines."));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search, page]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      manufacturer_name: row.manufacturer_name || "",
      composition: row.composition || "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await updateMedicine(editing.id, form);
      } else {
        await createMedicine(form);
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save medicine."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete medicine "${row.name}"?`)) return;
    setError("");
    try {
      await deleteMedicine(row.id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete medicine."));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError("");
    setImportResult(null);
    try {
      await exportMedicines();
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    setError("");
    setImportResult(null);
    try {
      const { data } = await importMedicines(file);
      setImportResult(data);
      setPage(1);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Import failed."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="page-card medicines-page">
      <div className="page-card-header">
        <h2>Medicine master</h2>
        <p>
          Global medicine list shared across all clinics — name, manufacturer, and composition only.
          Import CSV (Save As CSV from Excel).
        </p>
      </div>

      <div className="crud-toolbar medicines-toolbar">
        <div className="tenant-toolbar-left">
          <span>
            {loading
              ? "Loading…"
              : `${pagination.total.toLocaleString()} medicine(s)${search.trim() ? " found" : ""}`}
          </span>
          <input
            type="search"
            className="medicines-search"
            placeholder="Search name, manufacturer, composition…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="medicines-toolbar-actions">
          <button
            type="button"
            className="crud-btn crud-btn--export"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <button
            type="button"
            className="crud-btn crud-btn--import"
            onClick={handleImportClick}
            disabled={importing}
          >
            {importing ? "Importing…" : "Import CSV"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="medicines-import-input"
            onChange={handleImportFile}
          />
          <button type="button" className="crud-btn crud-btn--primary" onClick={openCreate}>
            Add medicine
          </button>
        </div>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}
      {importResult && (
        <div className="medicines-import-result">
          {importResult.message}
          {importResult.skipped > 0 && ` Skipped ${importResult.skipped} row(s).`}
          {importResult.duplicates > 0 && ` Merged ${importResult.duplicates} duplicate name(s).`}
          {importResult.errors?.length > 0 && (
            <ul className="medicines-import-errors">
              {importResult.errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="crud-table-wrap">
        <table className="crud-table medicines-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Manufacturer</th>
              <th>Composition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="crud-empty">
                  No medicines yet. Add one or import a CSV file.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.manufacturer_name || "—"}</td>
                <td>{row.composition || "—"}</td>
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

      {!loading && pagination.last_page > 1 && (
        <div className="medicines-pagination">
          <button
            type="button"
            className="crud-btn crud-btn--ghost crud-btn--sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span>
            Page {pagination.current_page || page} of {pagination.last_page.toLocaleString()}
          </span>
          <button
            type="button"
            className="crud-btn crud-btn--ghost crud-btn--sm"
            disabled={page >= pagination.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      <Modal title={editing ? "Edit medicine" : "Add medicine"} open={modalOpen} onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          <div className="crud-form-grid">
            <div className="crud-field crud-field--full">
              <label htmlFor="name">Medicine name</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Enter medicine name" />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="manufacturer_name">Manufacturer name</label>
              <input
                id="manufacturer_name"
                name="manufacturer_name"
                value={form.manufacturer_name}
                onChange={handleChange}
                placeholder="Enter manufacturer name"
              />
            </div>
            <div className="crud-field crud-field--full">
              <label htmlFor="composition">Composition</label>
              <textarea
                id="composition"
                name="composition"
                value={form.composition}
                onChange={handleChange}
                rows={3}
                placeholder="e.g. Amoxycillin (500mg) + Clavulanic Acid (125mg)"
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

export default Medicines;
