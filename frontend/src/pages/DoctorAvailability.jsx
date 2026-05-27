import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "../App.css";
import {
  getDoctorAvailabilities,
  saveDoctorAvailabilities,
} from "../api/doctorAvailabilities";
import { useAuth } from "../auth/AuthContext";
import { ROLES } from "../config/roles";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./DoctorAvailability.css";

const SLOT_OPTIONS = [15, 20, 30, 45, 60];

function DoctorAvailability() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isCompanyAdmin, isDoctor } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage =
    isSuperAdmin ||
    isCompanyAdmin ||
    (isDoctor && String(user?.doctor_id) === String(doctorId));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getDoctorAvailabilities(doctorId);
      setDoctor(data.doctor);
      setDays(data.days);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load schedule."));
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateDay = (dayOfWeek, field, value) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === dayOfWeek
          ? { ...d, [field]: field === "is_active" ? Boolean(value) : value }
          : d
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const schedules = days.map((d) => ({
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
        slot_duration: Number(d.slot_duration),
        max_patients: Number(d.max_patients),
        is_active: Boolean(d.is_active),
      }));
      await saveDoctorAvailabilities(doctorId, schedules);
      setSuccess("Weekly schedule saved successfully.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save schedule."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-card">Loading schedule…</div>;
  }

  return (
    <section className="availability-page">
      <header className="availability-header">
        <div>
          <Link to="/doctors" className="crud-btn crud-btn--ghost crud-btn--sm">
            ← Back to doctors
          </Link>
          <h2>Doctor availability</h2>
          <p>Set weekly working hours, slot length, and daily patient limits.</p>
          {doctor && (
            <div className="availability-meta">
              <span className="tenant-company-badge">{doctor.company_name}</span>
              <span className="crud-badge crud-badge--active">
                {doctor.name} · {doctor.doctor_code}
              </span>
              {doctor.department && (
                <span className="crud-badge crud-badge--inactive">{doctor.department}</span>
              )}
            </div>
          )}
        </div>
      </header>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}
      {success && (
        <div className="crud-alert" style={{ background: "#ecfdf5", color: "#047857" }}>
          {success}
        </div>
      )}

      {!canManage && (
        <div className="crud-alert crud-alert--error">
          You have view-only access. Contact your company admin to change this schedule.
        </div>
      )}

      <div className="availability-week">
        {days.map((day) => (
          <div
            key={day.day_of_week}
            className={`availability-day-card ${day.is_active ? "is-active" : "is-disabled"}`}
          >
            <div className="availability-day-label">
              <strong>{day.day_label}</strong>
              <div className="availability-day-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(day.is_active)}
                    disabled={!canManage}
                    onChange={(e) => updateDay(day.day_of_week, "is_active", e.target.checked)}
                  />
                  Available
                </label>
              </div>
            </div>

            <div className="availability-day-fields">
              <div className="crud-field">
                <label>Start</label>
                <input
                  type="time"
                  value={day.start_time}
                  disabled={!canManage || !day.is_active}
                  onChange={(e) => updateDay(day.day_of_week, "start_time", e.target.value)}
                />
              </div>
              <div className="crud-field">
                <label>End</label>
                <input
                  type="time"
                  value={day.end_time}
                  disabled={!canManage || !day.is_active}
                  onChange={(e) => updateDay(day.day_of_week, "end_time", e.target.value)}
                />
              </div>
              <div className="crud-field">
                <label>Slot (min)</label>
                <select
                  value={day.slot_duration}
                  disabled={!canManage || !day.is_active}
                  onChange={(e) =>
                    updateDay(day.day_of_week, "slot_duration", e.target.value)
                  }
                >
                  {SLOT_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>
              <div className="crud-field">
                <label>Max patients / day</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={day.max_patients}
                  disabled={!canManage || !day.is_active}
                  onChange={(e) => updateDay(day.day_of_week, "max_patients", e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="availability-actions-bar">
        <button type="button" className="crud-btn crud-btn--ghost" onClick={() => navigate("/doctors")}>
          Cancel
        </button>
        {canManage && (
          <button
            type="button"
            className="crud-btn crud-btn--primary"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save weekly schedule"}
          </button>
        )}
      </div>
    </section>
  );
}

export default DoctorAvailability;
