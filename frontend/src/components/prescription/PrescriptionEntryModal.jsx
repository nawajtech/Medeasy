import { useCallback, useEffect, useRef, useState } from "react";
import { getMedicines } from "../../api/medicines";
import Modal from "../crud/Modal";
import {
  BASIC_CARE_SUGGESTIONS,
  buildPrescriptionPayload,
  createRxItem,
  DOSE_PRESETS,
  DURATION_UNITS,
  emptyPrescriptionForm,
  FREQUENCY_OPTIONS,
  INSTRUCTION_SUGGESTIONS,
  parsePrescriptionData,
  TIMING_OPTIONS,
} from "../../utils/prescription";
import "./PrescriptionEntry.css";

function MedicineCard({ item, index, onChange, onRemove }) {
  const applyPreset = (preset) => {
    onChange({
      ...item,
      dose_morning: preset.morning,
      dose_afternoon: preset.afternoon,
      dose_night: preset.night,
      ...(preset.frequency ? { frequency: preset.frequency } : {}),
    });
  };

  const updateField = (field, value) => onChange({ ...item, [field]: value });

  const doseActive =
    `${item.dose_morning ?? ""}-${item.dose_afternoon ?? ""}-${item.dose_night ?? ""}`;

  return (
    <article className="rx-card">
      <header className="rx-card__header">
        <div>
          <span className="rx-card__index">{index + 1}</span>
          <h4 className="rx-card__name">{item.name}</h4>
          {item.composition && (
            <p className="rx-card__composition">{item.composition}</p>
          )}
          {item.manufacturer_name && (
            <p className="rx-card__manufacturer">{item.manufacturer_name}</p>
          )}
        </div>
        <button
          type="button"
          className="rx-card__remove"
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
        >
          ×
        </button>
      </header>

      <div className="rx-card__section">
        <span className="rx-card__label">Dose (Morning · Afternoon · Night)</span>
        <div className="rx-dose-row">
          {[
            { key: "dose_morning", label: "M" },
            { key: "dose_afternoon", label: "A" },
            { key: "dose_night", label: "N" },
          ].map(({ key, label }) => (
            <label key={key} className="rx-dose-input">
              <span>{label}</span>
              <input
                type="text"
                inputMode="numeric"
                value={item[key] ?? ""}
                onChange={(e) => updateField(key, e.target.value)}
                placeholder="0"
              />
            </label>
          ))}
        </div>
        <div className="rx-presets">
          {DOSE_PRESETS.map((preset) => {
            const active =
              preset.frequency === "sos"
                ? item.frequency === "sos"
                : doseActive === preset.label;
            return (
              <button
                key={preset.label}
                type="button"
                className={`rx-preset${active ? " rx-preset--active" : ""}`}
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rx-card__grid">
        <label className="rx-field">
          <span>Duration</span>
          <div className="rx-duration">
            <input
              type="number"
              min="1"
              value={item.duration_value}
              onChange={(e) => updateField("duration_value", e.target.value)}
              placeholder="7"
            />
            <select
              value={item.duration_unit}
              onChange={(e) => updateField("duration_unit", e.target.value)}
            >
              {DURATION_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="rx-field">
          <span>Timing</span>
          <select
            value={item.timing}
            onChange={(e) => updateField("timing", e.target.value)}
          >
            {TIMING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="rx-field">
          <span>Frequency</span>
          <select
            value={item.frequency}
            onChange={(e) => updateField("frequency", e.target.value)}
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="rx-field rx-field--full">
        <span>Instructions</span>
        <input
          type="text"
          list={`rx-instructions-${item.id}`}
          value={item.instruction}
          onChange={(e) => updateField("instruction", e.target.value)}
          placeholder="e.g. Take with water"
        />
        <datalist id={`rx-instructions-${item.id}`}>
          {INSTRUCTION_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
    </article>
  );
}

export default function PrescriptionEntryModal({
  open,
  onClose,
  appointment,
  saving,
  error,
  onSave,
  onPrint,
  prescriptionFile,
  onPrescriptionFileChange,
  existingPrescriptionFileUrl,
}) {
  const [mode, setMode] = useState("structured");
  const [form, setForm] = useState(emptyPrescriptionForm());
  const [localError, setLocalError] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [followUpMode, setFollowUpMode] = useState("days");
  const searchWrapRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open || !appointment) return;
    const type = appointment.prescription_type || "structured";
    setMode(type === "upload" ? "upload" : "structured");
    const parsed = parsePrescriptionData(appointment);
    setForm(parsed);
    setFollowUpMode(parsed.follow_up_date ? "date" : "days");
    setSearch("");
    setSearchResults([]);
    setLocalError("");
  }, [open, appointment]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSearch = useCallback(async (query) => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const { data } = await getMedicines({ search: q, per_page: 12 });
      setSearchResults(data.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    setDropdownOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 280);
  };

  const addMedicine = (medicine) => {
    const item = createRxItem({
      medicine_id: medicine.id ?? null,
      name: medicine.name,
      manufacturer_name: medicine.manufacturer_name || "",
      composition: medicine.composition || "",
    });
    setForm((prev) => ({ ...prev, items: [...prev.items, item] }));
    setSearch("");
    setSearchResults([]);
    setDropdownOpen(false);
  };

  const addCustomMedicine = () => {
    const name = search.trim();
    if (!name) return;
    addMedicine({ name, manufacturer_name: "", composition: "" });
  };

  const updateItem = (index, updated) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? updated : item)),
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const toggleCareSuggestion = (label) => {
    setForm((prev) => {
      const selected = prev.care_suggestions || [];
      const next = selected.includes(label)
        ? selected.filter((s) => s !== label)
        : [...selected, label];
      return { ...prev, care_suggestions: next };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    if (mode === "upload") {
      onSave({ prescription_type: "upload", prescription: null, prescription_data: null });
      return;
    }

    if (form.items.length === 0) {
      setLocalError("Add at least one medicine to the prescription.");
      return;
    }

    onSave(buildPrescriptionPayload(form));
  };

  const showNoResults =
    dropdownOpen &&
    search.trim().length >= 2 &&
    !searchLoading &&
    searchResults.length === 0;

  const patientName = appointment?.patient?.name || "Patient";

  return (
    <Modal
      title={`Prescription — ${patientName}`}
      open={open}
      onClose={onClose}
      wide
      className="rx-entry-modal"
    >
      <form className="rx-entry" onSubmit={handleSubmit}>
        {(error || localError) && (
          <div className="crud-alert crud-alert--error">{error || localError}</div>
        )}

        <div className="rx-mode-tabs">
          <button
            type="button"
            className={`rx-mode-tab${mode === "structured" ? " rx-mode-tab--active" : ""}`}
            onClick={() => setMode("structured")}
          >
            Write Prescription
          </button>
          <button
            type="button"
            className={`rx-mode-tab${mode === "upload" ? " rx-mode-tab--active" : ""}`}
            onClick={() => setMode("upload")}
          >
            Upload File
          </button>
        </div>

        {mode === "structured" ? (
          <>
            <div className="rx-search-wrap" ref={searchWrapRef}>
              <label className="rx-search-label" htmlFor="rx-medicine-search">
                Search medicines
              </label>
              <div className="rx-search-box">
                <svg className="rx-search-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M10.5 3a7.5 7.5 0 105.35 13.35l4.15 4.15a1 1 0 001.42-1.42l-4.15-4.15A7.5 7.5 0 0010.5 3zm0 2a5.5 5.5 0 110 11 5.5 5.5 0 010-11z"
                    fill="currentColor"
                  />
                </svg>
                <input
                  id="rx-medicine-search"
                  type="search"
                  className="rx-search-input"
                  placeholder="Search by medicine name or composition…"
                  value={search}
                  onChange={handleSearchChange}
                  onFocus={() => search.trim().length >= 2 && setDropdownOpen(true)}
                  autoComplete="off"
                />
                {searchLoading && <span className="rx-search-spinner" />}
              </div>

              {dropdownOpen && search.trim().length >= 2 && (
                <ul className="rx-search-dropdown" role="listbox">
                  {searchResults.map((med) => (
                    <li key={med.id}>
                      <button
                        type="button"
                        className="rx-search-option"
                        onClick={() => addMedicine(med)}
                      >
                        <strong>{med.name}</strong>
                        {med.composition && (
                          <span className="rx-search-option__meta">{med.composition}</span>
                        )}
                      </button>
                    </li>
                  ))}
                  {showNoResults && (
                    <li>
                      <button
                        type="button"
                        className="rx-search-option rx-search-option--custom"
                        onClick={addCustomMedicine}
                      >
                        + Add Custom Medicine: &ldquo;{search.trim()}&rdquo;
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div className="rx-cards">
              {form.items.length === 0 ? (
                <p className="rx-empty">
                  Search and select medicines above, or use &ldquo;Add Custom Medicine&rdquo; if not
                  found in the master list.
                </p>
              ) : (
                form.items.map((item, index) => (
                  <MedicineCard
                    key={item.id}
                    item={item}
                    index={index}
                    onChange={(updated) => updateItem(index, updated)}
                    onRemove={() => removeItem(index)}
                  />
                ))
              )}
            </div>

            <button
              type="button"
              className="rx-add-btn"
              onClick={() => {
                setSearch("");
                document.getElementById("rx-medicine-search")?.focus();
              }}
            >
              + Add Another Medicine
            </button>

            <fieldset className="rx-care-suggestions">
              <legend>🔥 Basic Care Suggestions (Most Used)</legend>
              <div className="rx-care-grid">
                {BASIC_CARE_SUGGESTIONS.map((label) => (
                  <label key={label} className="rx-care-check">
                    <input
                      type="checkbox"
                      checked={(form.care_suggestions || []).includes(label)}
                      onChange={() => toggleCareSuggestion(label)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="rx-field rx-field--full rx-advice">
              <span>Doctor Advice / Notes</span>
              <textarea
                rows={3}
                value={form.advice}
                onChange={(e) => setForm((prev) => ({ ...prev, advice: e.target.value }))}
                placeholder="Additional advice or custom notes (optional)…"
              />
            </label>

            <fieldset className="rx-followup">
              <legend>Follow-up</legend>
              <div className="rx-followup-tabs">
                <label className="rx-followup-tab">
                  <input
                    type="radio"
                    name="follow_up_mode"
                    checked={followUpMode === "days"}
                    onChange={() => setFollowUpMode("days")}
                  />
                  After days
                </label>
                <label className="rx-followup-tab">
                  <input
                    type="radio"
                    name="follow_up_mode"
                    checked={followUpMode === "date"}
                    onChange={() => setFollowUpMode("date")}
                  />
                  Specific date
                </label>
              </div>
              {followUpMode === "days" ? (
                <div className="rx-followup-input">
                  <input
                    type="number"
                    min="0"
                    placeholder="7"
                    value={form.follow_up_days}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        follow_up_days: e.target.value,
                        follow_up_date: "",
                      }))
                    }
                  />
                  <span>days</span>
                </div>
              ) : (
                <input
                  type="date"
                  className="rx-followup-date"
                  value={form.follow_up_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      follow_up_date: e.target.value,
                      follow_up_days: "",
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                />
              )}
            </fieldset>
          </>
        ) : (
          <div className="rx-upload">
            <label htmlFor="rx_upload_file">Upload prescription (image or PDF)</label>
            <input
              id="rx_upload_file"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => onPrescriptionFileChange(e.target.files?.[0] || null)}
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

        <div className="crud-modal-actions rx-actions">
          {appointment && (
            <button
              type="button"
              className="crud-btn crud-btn--ghost"
              onClick={() => onPrint(appointment.id)}
            >
              Print / PDF
            </button>
          )}
          <button type="button" className="crud-btn crud-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="crud-btn crud-btn--primary rx-save-btn" disabled={saving}>
            {saving ? "Saving…" : "Save Prescription"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
