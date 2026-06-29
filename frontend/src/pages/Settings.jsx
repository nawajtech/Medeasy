import { useCallback, useEffect, useRef, useState } from "react";
import "../App.css";
import { bulkUpdateSettings, getSettingsForm, uploadSettingImage } from "../api/settings";
import { getCompaniesList } from "../api/companiesList";
import { useAuth } from "../auth/AuthContext";
import CompanySelect from "../components/CompanySelect";
import RichTextEditor from "../components/RichTextEditor";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Settings.css";

const GROUP_LABELS = {
  general: "General & branding",
  billing: "Billing",
  appointments: "Appointments",
  notifications: "Notifications",
  content: "Footer content",
};

const GROUP_ORDER = ["general", "billing", "appointments", "notifications", "content"];

const IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const BRANDING_KEYS = new Set(["company_logo", "favicon"]);

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IconUpload({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0L8 8m4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImageUploadCard({ field, value, preview, fileName, uploading, onSelect, onClear }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const displaySrc = preview || value;
  const isFavicon = field.key === "favicon";

  const processFile = async (file) => {
    setFileError("");

    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/i)) {
      setFileError("Please choose a JPG, PNG, GIF, WebP, or SVG image.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFileError(`File is too large (${formatFileSize(file.size)}). Max 2 MB.`);
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    onSelect({ image_base64: dataUrl, fileName: file.name });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = "";
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const openPicker = () => inputRef.current?.click();

  const handleClear = () => {
    setFileError("");
    onClear();
  };

  return (
    <div className={`settings-upload-card${isFavicon ? " settings-upload-card--favicon" : ""}`}>
      <div className="settings-upload-card__header">
        <label className="settings-label">
          <span className="settings-upload-card__title">{field.label}</span>
          <code className="settings-key">{field.key}</code>
        </label>
        {displaySrc && (
          <button type="button" className="settings-upload-remove" onClick={handleClear}>
            Remove
          </button>
        )}
      </div>

      <div
        className={`settings-upload-dropzone${dragging ? " is-dragging" : ""}${displaySrc ? " has-image" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={!displaySrc ? openPicker : undefined}
        onKeyDown={(e) => {
          if (!displaySrc && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openPicker();
          }
        }}
        role={displaySrc ? undefined : "button"}
        tabIndex={displaySrc ? undefined : 0}
      >
        {displaySrc ? (
          <div className="settings-upload-preview">
            <img src={displaySrc} alt={field.label} className="settings-upload-preview__img" />
            <div className="settings-upload-preview__overlay">
              <button
                type="button"
                className="crud-btn crud-btn--ghost crud-btn--sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openPicker();
                }}
              >
                Replace file
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-upload-empty">
            <span className="settings-upload-empty__icon">
              <IconUpload />
            </span>
            <p className="settings-upload-empty__title">
              Drag & drop or <span>browse</span>
            </p>
            <p className="settings-upload-empty__hint">
              {isFavicon ? "Square icon · 32×32 or 64×64 recommended" : "PNG or SVG recommended · Max 2 MB"}
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        id={`file-${field.key}`}
        type="file"
        accept={IMAGE_ACCEPT}
        className="settings-file-input"
        onChange={handleFileChange}
      />

      {uploading && <p className="settings-upload-filename">Uploading…</p>}
      {!uploading && fileName && <p className="settings-upload-filename">{fileName}</p>}
      {fileError && <p className="settings-upload-error">{fileError}</p>}
      {!fileError && (
        <p className="settings-field-hint">JPG, PNG, GIF, WebP, SVG · Max 2 MB</p>
      )}
    </div>
  );
}

function SettingField({ field, formValues, editorRef, onChange, onImageUpload }) {
  const entry = formValues[field.key] || { value: "", image_base64: null, fileName: "", uploading: false };

  if (field.type === "image") {
    return (
      <ImageUploadCard
        field={field}
        value={entry.value}
        preview={entry.image_base64 || entry.value}
        fileName={entry.fileName}
        uploading={entry.uploading}
        onSelect={onImageUpload}
        onClear={() => onChange(field.key, { value: "", image_base64: null, fileName: "", uploading: false })}
      />
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        id={field.key}
        value={entry.value}
        onChange={(e) => onChange(field.key, { value: e.target.value })}
        placeholder={field.placeholder}
        rows={2}
      />
    );
  }

  if (field.type === "editor") {
    return (
      <RichTextEditor
        ref={editorRef}
        id={field.key}
        value={entry.value}
        onChange={(html) => onChange(field.key, { value: html })}
        placeholder={field.placeholder}
      />
    );
  }

  return (
    <input
      id={field.key}
      type={field.type === "number" ? "number" : field.type}
      value={entry.value}
      onChange={(e) => onChange(field.key, { value: e.target.value })}
      placeholder={field.placeholder}
      min={field.type === "number" ? 0 : undefined}
    />
  );
}

function Settings() {
  const { isSuperAdmin, companyId: authCompanyId } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    isSuperAdmin ? "" : String(authCompanyId || "")
  );
  const [groups, setGroups] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const editorRefs = useRef({});

  useEffect(() => {
    if (!isSuperAdmin) return;
    getCompaniesList()
      .then((res) => {
        if (res.data.length > 0) {
          setSelectedCompanyId((current) => current || String(res.data[0].id));
        }
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  const load = useCallback(async () => {
    const companyId = isSuperAdmin ? selectedCompanyId : String(authCompanyId || "");
    if (!companyId) {
      setGroups(null);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const params = isSuperAdmin ? { company_id: companyId } : {};
      const { data } = await getSettingsForm(params);
      setGroups(data.groups);

      const nextValues = {};
      GROUP_ORDER.forEach((groupKey) => {
        (data.groups[groupKey] || []).forEach((field) => {
          nextValues[field.key] = { value: field.value || "", image_base64: null, fileName: "" };
        });
      });
      setFormValues(nextValues);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load settings."));
      setGroups(null);
    } finally {
      setLoading(false);
    }
  }, [authCompanyId, isSuperAdmin, selectedCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCompanyChange = (e) => {
    setSelectedCompanyId(e.target.value);
    setSuccess("");
  };

  const handleFieldChange = (key, patch) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
    setSuccess("");
  };

  const handleImageUpload = async (field, { image_base64, fileName }) => {
    const companyId = isSuperAdmin ? selectedCompanyId : String(authCompanyId || "");
    if (!companyId) return;

    handleFieldChange(field.key, {
      image_base64,
      fileName,
      uploading: true,
    });
    setError("");

    try {
      const payload = {
        key: field.key,
        image_base64,
      };
      if (isSuperAdmin) {
        payload.company_id = Number(companyId);
      }

      const { data } = await uploadSettingImage(payload);
      handleFieldChange(field.key, {
        value: data.value,
        image_base64: null,
        fileName,
        uploading: false,
      });
    } catch (err) {
      handleFieldChange(field.key, { uploading: false });
      setError(getApiErrorMessage(err, "Failed to upload image."));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const nextValues = { ...formValues };
    Object.keys(editorRefs.current).forEach((key) => {
      const editor = editorRefs.current[key];
      if (editor?.getHtml) {
        nextValues[key] = { ...nextValues[key], value: editor.getHtml() };
      }
    });

    const payload = {
      settings: Object.entries(nextValues).map(([key, entry]) => ({
        key,
        value: entry?.value ?? "",
      })),
    };

    if (isSuperAdmin) {
      payload.company_id = Number(selectedCompanyId);
    }

    try {
      await bulkUpdateSettings(payload);
      setSuccess("Settings saved successfully.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save settings."));
    } finally {
      setSaving(false);
    }
  };

  const renderGroupFields = (fields) => {
    const imageFields = fields.filter((f) => f.type === "image");
    const editorFields = fields.filter((f) => f.type === "editor");
    const textFields = fields.filter((f) => f.type !== "image" && f.type !== "editor");
    const brandingFields = imageFields.filter((f) => BRANDING_KEYS.has(f.key));
    const otherImageFields = imageFields.filter((f) => !BRANDING_KEYS.has(f.key));

    const renderFieldRow = (field, fullWidth = false) => (
      <div
        key={field.key}
        className={`settings-field${fullWidth ? " settings-field--full" : ""}`}
      >
        {field.type !== "image" && (
          <label htmlFor={field.type === "editor" ? undefined : field.key} className="settings-label">
            <span>{field.label}</span>
            <code className="settings-key">{field.key}</code>
          </label>
        )}
        <SettingField
          field={field}
          formValues={formValues}
          editorRef={(el) => {
            if (field.type === "editor") {
              if (el) editorRefs.current[field.key] = el;
              else delete editorRefs.current[field.key];
            }
          }}
          onChange={handleFieldChange}
          onImageUpload={(data) => handleImageUpload(field, data)}
        />
      </div>
    );

    return (
      <>
        {brandingFields.length > 0 && (
          <div className="settings-branding-row">
            {brandingFields.map((field) => (
              <SettingField
                key={field.key}
                field={field}
                formValues={formValues}
                onChange={handleFieldChange}
                onImageUpload={(data) => handleImageUpload(field, data)}
              />
            ))}
          </div>
        )}

        {(textFields.length > 0 || otherImageFields.length > 0) && (
          <div className="settings-fields">
            {[...otherImageFields, ...textFields].map((field) =>
              renderFieldRow(field, field.type === "image")
            )}
          </div>
        )}

        {editorFields.length > 0 && (
          <div className="settings-editor-row">
            {editorFields.map((field) => renderFieldRow(field, true))}
          </div>
        )}
      </>
    );
  };

  const hasCompany = isSuperAdmin ? Boolean(selectedCompanyId) : Boolean(authCompanyId);

  return (
    <section className="page-card settings-page">
      <div className="page-card-header settings-page-header">
        <h2>Settings</h2>
        <p>Configure branding, billing, and organisation preferences.</p>
      </div>

      {isSuperAdmin && (
        <div className="settings-company-bar">
          <CompanySelect
            id="settings_company_id"
            value={selectedCompanyId}
            onChange={handleCompanyChange}
            label="Organisation"
          />
        </div>
      )}

      {error && <div className="crud-alert crud-alert--error">{error}</div>}
      {success && <div className="crud-alert crud-alert--success">{success}</div>}

      {!hasCompany && (
        <p className="settings-empty">Select an organisation to manage its settings.</p>
      )}

      {hasCompany && loading && <p className="settings-loading">Loading settings…</p>}

      {hasCompany && !loading && groups && (
        <form className="settings-form" onSubmit={handleSubmit}>
          {GROUP_ORDER.map((groupKey) => {
            const fields = groups[groupKey] || [];
            if (fields.length === 0) return null;

            return (
              <fieldset key={groupKey} className="settings-group">
                <legend>{GROUP_LABELS[groupKey] || groupKey}</legend>
                {renderGroupFields(fields)}
              </fieldset>
            );
          })}

          <div className="settings-actions">
            <button type="submit" className="crud-btn crud-btn--primary" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default Settings;
