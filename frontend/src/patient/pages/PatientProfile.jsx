import { useState } from "react";
import { patientChangePassword, patientUpdateProfile } from "../api/portal";
import { usePatientAuth } from "../auth/PatientAuthContext";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PatientProfile() {
  const { patient, setPatient } = usePatientAuth();
  const [form, setForm] = useState({
    name: patient?.name || "",
    email: patient?.email || "",
    phone: patient?.phone || "",
    gender: patient?.gender || "",
    date_of_birth: patient?.date_of_birth || "",
    blood_group: patient?.blood_group || "",
    address: patient?.address || "",
    emergency_contact_name: patient?.emergency_contact_name || "",
    emergency_contact_phone: patient?.emergency_contact_phone || "",
    allergies: patient?.allergies || "",
    medical_history: patient?.medical_history || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await patientUpdateProfile({
        ...form,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
      });
      setPatient(data.patient);
      setMessage(data.message || "Profile updated.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Update failed."));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await patientChangePassword(passwordForm);
      setMessage(data.message || "Password changed.");
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err) {
      setError(getApiErrorMessage(err, "Password change failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="pt-page-head">
        <h1 className="pt-page-title">My profile</h1>
        <p className="pt-page-sub">Patient ID: {patient?.patient_code || "—"}</p>
      </div>

      {message ? <p className="pt-success">{message}</p> : null}
      {error ? <p className="pt-error">{error}</p> : null}

      <form className="pt-panel" onSubmit={saveProfile}>
        <h2>Personal details</h2>
        <div className="pt-list">
          <div className="pt-field">
            <label>Name</label>
            <input value={form.name} onChange={set("name")} required />
          </div>
          <div className="pt-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set("email")} required />
          </div>
          <div className="pt-field">
            <label>Phone</label>
            <input value={form.phone} onChange={set("phone")} required />
          </div>
          <div className="pt-field">
            <label>Gender</label>
            <select value={form.gender} onChange={set("gender")}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="pt-field">
            <label>Date of birth</label>
            <input type="date" value={form.date_of_birth || ""} onChange={set("date_of_birth")} />
          </div>
          <div className="pt-field">
            <label>Blood group</label>
            <input value={form.blood_group} onChange={set("blood_group")} />
          </div>
          <div className="pt-field">
            <label>Address</label>
            <textarea rows={2} value={form.address} onChange={set("address")} />
          </div>
          <div className="pt-field">
            <label>Emergency contact name</label>
            <input value={form.emergency_contact_name} onChange={set("emergency_contact_name")} />
          </div>
          <div className="pt-field">
            <label>Emergency contact phone</label>
            <input value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} />
          </div>
          <div className="pt-field">
            <label>Allergies</label>
            <textarea rows={2} value={form.allergies} onChange={set("allergies")} />
          </div>
          <div className="pt-field">
            <label>Medical history</label>
            <textarea rows={3} value={form.medical_history} onChange={set("medical_history")} />
          </div>
        </div>
        <div className="pt-actions pt-actions--stack">
          <button className="pt-btn" type="submit" disabled={saving}>
            Save profile
          </button>
        </div>
      </form>

      <form className="pt-panel" onSubmit={savePassword}>
        <h2>Change password</h2>
        <div className="pt-list">
          <div className="pt-field">
            <label>Current password</label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm((p) => ({ ...p, current_password: e.target.value }))}
              required
            />
          </div>
          <div className="pt-field">
            <label>New password</label>
            <input
              type="password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((p) => ({ ...p, password: e.target.value }))}
              minLength={8}
              required
            />
          </div>
          <div className="pt-field">
            <label>Confirm new password</label>
            <input
              type="password"
              value={passwordForm.password_confirmation}
              onChange={(e) =>
                setPasswordForm((p) => ({ ...p, password_confirmation: e.target.value }))
              }
              minLength={8}
              required
            />
          </div>
        </div>
        <div className="pt-actions pt-actions--stack">
          <button className="pt-btn" type="submit" disabled={saving}>
            Update password
          </button>
        </div>
      </form>
    </div>
  );
}
