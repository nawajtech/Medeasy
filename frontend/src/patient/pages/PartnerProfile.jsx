import { useState } from "react";
import { partnerChangePassword, partnerUpdateProfile } from "../api/portal";
import { usePartnerAuth } from "../auth/PartnerAuthContext";
import { Alert, FormGrid, PageHeader, Panel } from "../components/ui";
import { getApiErrorMessage } from "../../utils/apiError";

const PARTNER_TYPES = [
  { value: "doctor", label: "Doctor" },
  { value: "clinic", label: "Clinic" },
  { value: "hospital", label: "Hospital" },
  { value: "agent", label: "Agent" },
];

export default function PartnerProfile() {
  const { partner, setPartner } = usePartnerAuth();
  const [form, setForm] = useState({
    name: partner?.name || "",
    type: partner?.type || "doctor",
    email: partner?.email || "",
    phone: partner?.phone || "",
    address: partner?.address || "",
    city: partner?.city || "",
    state: partner?.state || "",
    professional_details: partner?.professional_details || "",
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
      const { data } = await partnerUpdateProfile({
        ...form,
        professional_details: form.professional_details || null,
      });
      setPartner(data.partner);
      setMessage("Profile updated.");
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
      const { data } = await partnerChangePassword(passwordForm);
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
      <PageHeader
        title="Partner profile"
        subtitle="Keep your organisation details up to date for centre partnerships."
      />

      <Alert type="success">{message}</Alert>
      <Alert type="error">{error}</Alert>

      <form onSubmit={saveProfile}>
        <Panel
          title="Profile details"
          subtitle="Shown to diagnostic centres when you request a partnership."
          footer={
            <button className="pt-btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          }
        >
          <FormGrid columns={2}>
            <div className="pt-field">
              <label>Name / organisation</label>
              <input value={form.name} onChange={set("name")} required />
            </div>
            <div className="pt-field">
              <label>Partner type</label>
              <select value={form.type} onChange={set("type")} required>
                {PARTNER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={set("email")} required />
            </div>
            <div className="pt-field">
              <label>Phone</label>
              <input value={form.phone} onChange={set("phone")} required />
            </div>
            <div className="pt-field" style={{ gridColumn: "1 / -1" }}>
              <label>Address</label>
              <textarea value={form.address} onChange={set("address")} required rows={2} />
            </div>
            <div className="pt-field">
              <label>City</label>
              <input value={form.city} onChange={set("city")} required />
            </div>
            <div className="pt-field">
              <label>State</label>
              <input value={form.state} onChange={set("state")} required />
            </div>
            <div className="pt-field" style={{ gridColumn: "1 / -1" }}>
              <label>Professional details</label>
              <textarea
                value={form.professional_details}
                onChange={set("professional_details")}
                rows={2}
                placeholder="Registration number, speciality, etc."
              />
            </div>
          </FormGrid>
        </Panel>
      </form>

      <form onSubmit={savePassword}>
        <Panel
          title="Change password"
          subtitle="Use a strong password you do not reuse elsewhere."
          footer={
            <button className="pt-btn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Update password"}
            </button>
          }
        >
          <FormGrid columns={2}>
            <div className="pt-field">
              <label>Current password</label>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, current_password: e.target.value }))
                }
                required
              />
            </div>
            <div className="pt-field">
              <label>New password</label>
              <input
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm((p) => ({ ...p, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="pt-field">
              <label>Confirm password</label>
              <input
                type="password"
                value={passwordForm.password_confirmation}
                onChange={(e) =>
                  setPasswordForm((p) => ({ ...p, password_confirmation: e.target.value }))
                }
                required
                minLength={8}
              />
            </div>
          </FormGrid>
        </Panel>
      </form>
    </div>
  );
}
