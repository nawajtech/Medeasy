import { useCallback, useEffect, useState } from "react";
import {
  getDiagnosticTodayQueue,
  getDiagnosticOrder,
  updateDiagnosticVisitStatus,
  saveDiagnosticPrescription,
  openDiagnosticPrescription,
} from "../api/diagnostics";
import DiagnosticPrescriptionModal from "../components/diagnostic/DiagnosticPrescriptionModal";
import { useAuth } from "../auth/AuthContext";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./DiagnosticTodayQueue.css";

const VISIT_STATUS = {
  booked: { label: "Booked", className: "dtq-waiting" },
  scheduled: { label: "Waiting", className: "dtq-waiting" },
  in_progress: { label: "In progress", className: "dtq-progress" },
  completed: { label: "Completed", className: "dtq-done" },
  not_present: { label: "Not present", className: "dtq-absent" },
};

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function StatusPill({ status }) {
  const meta = VISIT_STATUS[status] || { label: status, className: "" };
  return <span className={`dtq-status ${meta.className}`}>{meta.label}</span>;
}

function DiagnosticTodayQueue() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [rxOpen, setRxOpen] = useState(false);
  const [rxOrder, setRxOrder] = useState(null);
  const [rxSaving, setRxSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getDiagnosticTodayQueue();
      setSummary(data.summary);
      setQueue(data.queue || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load today's appointments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const changeStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    setError("");
    try {
      await updateDiagnosticVisitStatus(orderId, { status });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update status."));
    } finally {
      setUpdatingId(null);
    }
  };

  const openPrescription = async (item) => {
    try {
      const { data } = await getDiagnosticOrder(item.id);
      setRxOrder(data);
      setRxOpen(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load order."));
    }
  };

  const handleSavePrescription = async (payload, order) => {
    setRxSaving(true);
    setError("");
    try {
      await saveDiagnosticPrescription(order.id, payload);
      await load();
      const { data } = await getDiagnosticOrder(order.id);
      setRxOrder(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save prescription."));
      throw err;
    } finally {
      setRxSaving(false);
    }
  };

  const handlePrintPrescription = async (order) => {
    setError("");
    try {
      await openDiagnosticPrescription(order.id);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to open prescription."));
    }
  };

  return (
    <section className="page-card dtq-page">
      <div className="page-card-header">
        <h2>Today&apos;s appointments</h2>
        <p>
          {user?.name ? `${user.name} — ` : ""}
          Patient queue for <strong>{todayLabel()}</strong>. Only today&apos;s scheduled visits are shown here.
        </p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="dtq-toolbar">
        <span className="dtq-today-badge">{todayLabel()}</span>
        <button type="button" className="crud-btn crud-btn--ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {summary && (
        <div className="dtq-summary">
          <div className="dtq-summary-card">
            <span className="dtq-summary-num">{summary.total}</span>
            <span className="dtq-summary-label">Total today</span>
          </div>
          <div className="dtq-summary-card dtq-summary-card--waiting">
            <span className="dtq-summary-num">{summary.waiting}</span>
            <span className="dtq-summary-label">Waiting</span>
          </div>
          <div className="dtq-summary-card dtq-summary-card--progress">
            <span className="dtq-summary-num">{summary.in_progress}</span>
            <span className="dtq-summary-label">In progress</span>
          </div>
          <div className="dtq-summary-card dtq-summary-card--done">
            <span className="dtq-summary-num">{summary.completed}</span>
            <span className="dtq-summary-label">Completed</span>
          </div>
          <div className="dtq-summary-card dtq-summary-card--absent">
            <span className="dtq-summary-num">{summary.not_present}</span>
            <span className="dtq-summary-label">Not present</span>
          </div>
        </div>
      )}

      <div className="crud-table-wrap">
        <table className="crud-table dtq-table">
          <thead>
            <tr>
              <th>Serial</th>
              <th>Time</th>
              <th>Patient</th>
              <th>Test</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="crud-empty">Loading queue…</td></tr>
            )}
            {!loading && queue.length === 0 && (
              <tr><td colSpan={7} className="crud-empty">
                No appointments for today. Orders must be assigned to you and booked or scheduled for today.
              </td></tr>
            )}
            {!loading && queue.map((item) => {
              const busy = updatingId === item.id;
              const canStart = ["booked", "scheduled", "not_present"].includes(item.status);
              const canComplete = item.status === "in_progress";
              const canAbsent = ["booked", "scheduled"].includes(item.status);
              const canRecall = item.status === "not_present";

              return (
                <tr key={item.id} className={item.status === "in_progress" ? "dtq-row-active" : undefined}>
                  <td>
                    <span className="dtq-serial">{item.queue_serial ?? "—"}</span>
                  </td>
                  <td>{formatTime(item.scheduled_at)}</td>
                  <td>
                    <strong>{item.patient?.name || "—"}</strong>
                    {item.patient?.phone && <div className="dtq-sub">{item.patient.phone}</div>}
                  </td>
                  <td>
                    <strong>{item.test_type?.name || "—"}</strong>
                    {item.test_type?.category?.name && (
                      <div className="dtq-sub">{item.test_type.category.name}</div>
                    )}
                  </td>
                  <td>
                    <span className={`dgn-priority dgn-priority-${item.priority}`}>{item.priority}</span>
                  </td>
                  <td><StatusPill status={item.status} /></td>
                  <td>
                    <div className="crud-actions dtq-actions">
                      {canStart && (
                        <button
                          type="button"
                          className="crud-btn crud-btn--primary crud-btn--sm"
                          disabled={busy}
                          onClick={() => changeStatus(item.id, "in_progress")}
                        >
                          Start
                        </button>
                      )}
                      {canComplete && (
                        <>
                          <button
                            type="button"
                            className="crud-btn crud-btn--primary crud-btn--sm"
                            disabled={busy}
                            onClick={() => openPrescription(item)}
                          >
                            Write Rx
                          </button>
                          <button
                            type="button"
                            className="crud-btn crud-btn--ghost crud-btn--sm"
                            disabled={busy}
                            onClick={() => changeStatus(item.id, "completed")}
                          >
                            Complete
                          </button>
                        </>
                      )}
                      {item.status === "completed" && item.report && (
                        <button
                          type="button"
                          className="crud-btn crud-btn--ghost crud-btn--sm"
                          onClick={() => handlePrintPrescription(item)}
                        >
                          Print Rx
                        </button>
                      )}
                      {canAbsent && (
                        <button
                          type="button"
                          className="crud-btn crud-btn--ghost crud-btn--sm"
                          disabled={busy}
                          onClick={() => changeStatus(item.id, "not_present")}
                        >
                          Not present
                        </button>
                      )}
                      {canRecall && (
                        <button
                          type="button"
                          className="crud-btn crud-btn--ghost crud-btn--sm"
                          disabled={busy}
                          onClick={() => changeStatus(item.id, "scheduled")}
                        >
                          Re-queue
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DiagnosticPrescriptionModal
        open={rxOpen}
        onClose={() => setRxOpen(false)}
        order={rxOrder}
        onSave={handleSavePrescription}
        onPrint={handlePrintPrescription}
        saving={rxSaving}
      />
    </section>
  );
}

export default DiagnosticTodayQueue;
