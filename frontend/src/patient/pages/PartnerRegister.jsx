import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePartnerAuth } from "../auth/PartnerAuthContext";
import { AuthShell, Alert, LoadingBlock, FormGrid } from "../components/ui";
import { getApiErrorMessage } from "../../utils/apiError";

const PARTNER_TYPES = [
  { value: "doctor", label: "Doctor" },
  { value: "clinic", label: "Clinic" },
  { value: "hospital", label: "Hospital" },
  { value: "agent", label: "Agent" },
];

const emptyForm = {
  name: "",
  type: "doctor",
  phone: "",
  email: "",
  password: "",
  password_confirmation: "",
  address: "",
  city: "",
  state: "",
  professional_details: "",
};

export default function PartnerRegister() {
  const { register, isAuthenticated, loading: authLoading } = usePartnerAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return <LoadingBlock label="Restoring session…" />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submitRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({
        ...form,
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create partner account"
      subtitle="Register as a doctor, clinic, hospital or agent. Centres approve partnerships separately."
      footer={
        <>
          Already registered? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="pt-auth__form" onSubmit={submitRegister}>
        <FormGrid>
          <div className="pt-field">
            <label htmlFor="name">Full name / Organisation</label>
            <input id="name" value={form.name} onChange={setField("name")} required />
          </div>
          <div className="pt-field">
            <label htmlFor="type">Partner type</label>
            <select id="type" value={form.type} onChange={setField("type")} required>
              {PARTNER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={setField("email")} required />
          </div>
          <div className="pt-field">
            <label htmlFor="phone">Mobile number</label>
            <input
              id="phone"
              value={form.phone}
              onChange={setField("phone")}
              required
              placeholder="10-digit mobile"
            />
          </div>
          <div className="pt-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={setField("password")}
              required
              minLength={8}
            />
          </div>
          <div className="pt-field">
            <label htmlFor="password_confirmation">Confirm password</label>
            <input
              id="password_confirmation"
              type="password"
              value={form.password_confirmation}
              onChange={setField("password_confirmation")}
              required
              minLength={8}
            />
          </div>
          <div className="pt-field">
            <label htmlFor="address">Address</label>
            <textarea id="address" value={form.address} onChange={setField("address")} required rows={2} />
          </div>
          <div className="pt-field">
            <label htmlFor="city">City</label>
            <input id="city" value={form.city} onChange={setField("city")} required />
          </div>
          <div className="pt-field">
            <label htmlFor="state">State</label>
            <input id="state" value={form.state} onChange={setField("state")} required />
          </div>
          <div className="pt-field">
            <label htmlFor="professional_details">Professional details (optional)</label>
            <textarea
              id="professional_details"
              value={form.professional_details}
              onChange={setField("professional_details")}
              rows={2}
              placeholder="Registration number, speciality, etc."
            />
          </div>
        </FormGrid>
        <Alert type="error">{error}</Alert>
        <button className="pt-btn pt-btn--block" type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
