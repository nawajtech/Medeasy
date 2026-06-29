import { useEffect, useState } from "react";
import Modal from "../crud/Modal";
import { getApiErrorMessage } from "../../utils/apiError";
import "./DiagnosticPrescriptionModal.css";

const emptyForm = { findings: "", impression: "", recommendations: "" };

export default function DiagnosticPrescriptionModal({
  open,
  onClose,
  order,
  onSave,
  onPrint,
  saving = false,
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      findings: order?.report?.findings || "",
      impression: order?.report?.impression || "",
      recommendations: order?.report?.recommendations || "",
    });
  }, [open, order]);

  const submit = async (complete, printAfter = false) => {
    setError("");
    if (!form.findings?.trim() && !form.impression?.trim() && !form.recommendations?.trim()) {
      setError("Write at least findings, impression, or recommendations.");
      return;
    }
    try {
      await onSave({ ...form, complete }, order);
      if (printAfter && onPrint) {
        await onPrint(order);
      }
      if (complete) {
        onClose();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save prescription."));
    }
  };

  if (!order) return null;

  return (
    <Modal
      title={`Prescription — ${order.order_number || ""}`}
      open={open}
      onClose={onClose}
    >
      <div className="dgn-rx-meta">
        <span><strong>{order.patient?.name || "Patient"}</strong></span>
        <span>{order.test_type?.name || "Test"}</span>
        {order.test_type?.category?.name && <span>{order.test_type.category.name}</span>}
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="dgn-rx-hint">
        Use section headings like <code>LIVER:</code>, <code>GALL BLADDER:</code>, <code>CBD:</code> on their own lines.
        Wrap important text in <code>**bold**</code> for print emphasis.
      </div>

      <div className="crud-field crud-field--full">
        <label>Findings / Prescription body *</label>
        <textarea
          rows={12}
          className="dgn-rx-body"
          value={form.findings}
          onChange={(e) => setForm((p) => ({ ...p, findings: e.target.value }))}
          placeholder={"LIVER:\n**Liver measures 16.8 cm.**\n\nGALL BLADDER:\nGall bladder is normal..."}
        />
      </div>
      <div className="crud-field crud-field--full">
        <label>Impression</label>
        <textarea
          rows={3}
          value={form.impression}
          onChange={(e) => setForm((p) => ({ ...p, impression: e.target.value }))}
        />
      </div>
      <div className="crud-field crud-field--full">
        <label>Recommendations / Advice</label>
        <textarea
          rows={3}
          value={form.recommendations}
          onChange={(e) => setForm((p) => ({ ...p, recommendations: e.target.value }))}
        />
      </div>

      <div className="crud-modal-actions dgn-rx-actions">
        <button type="button" className="crud-btn crud-btn--ghost" onClick={onClose}>Cancel</button>
        {order.report && onPrint && (
          <button type="button" className="crud-btn crud-btn--ghost" onClick={() => onPrint(order)}>
            Print
          </button>
        )}
        <button
          type="button"
          className="crud-btn crud-btn--ghost"
          disabled={saving}
          onClick={() => submit(false)}
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          className="crud-btn crud-btn--primary"
          disabled={saving}
          onClick={() => submit(false, true)}
        >
          {saving ? "Saving…" : "Save & print"}
        </button>
        <button
          type="button"
          className="crud-btn crud-btn--primary"
          disabled={saving}
          onClick={() => submit(true, true)}
        >
          {saving ? "Saving…" : "Complete & print"}
        </button>
      </div>
    </Modal>
  );
}
