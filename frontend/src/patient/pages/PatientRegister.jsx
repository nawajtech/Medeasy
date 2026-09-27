import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePatientAuth } from "../auth/PatientAuthContext";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PatientRegister() {
  const { register, isAuthenticated, loading: authLoading } = usePatientAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    gender: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="pt-loading">
        <div className="pt-spinner" />
        <p>Loading…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({
        ...form,
        gender: form.gender || null,
      });
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-auth">
      <div className="pt-auth__bg" aria-hidden="true" />
      <div className="pt-auth__shell">
        <div className="pt-auth__card">
          <img src="/apnamedi-logo.png" alt="ApnaMedi" className="pt-logo pt-logo--lg" />
          <p className="pt-auth__eyebrow">Patient Portal</p>
          <h1>Create your account</h1>
          <p className="pt-page-sub">Book diagnostic appointments and access reports in one place.</p>

          <form className="pt-auth__form" onSubmit={handleSubmit}>
            <div className="pt-field">
              <label htmlFor="name">Full name</label>
              <input id="name" autoComplete="name" value={form.name} onChange={set("name")} required />
            </div>
            <div className="pt-form-grid pt-form-grid--2">
              <div className="pt-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set("email")}
                  required
                />
              </div>
              <div className="pt-field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  required
                />
              </div>
            </div>
            <div className="pt-field">
              <label htmlFor="gender">Gender (optional)</label>
              <select id="gender" value={form.gender} onChange={set("gender")}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="pt-form-grid pt-form-grid--2">
              <div className="pt-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  minLength={8}
                  required
                />
              </div>
              <div className="pt-field">
                <label htmlFor="password_confirmation">Confirm</label>
                <input
                  id="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={form.password_confirmation}
                  onChange={set("password_confirmation")}
                  minLength={8}
                  required
                />
              </div>
            </div>
            {error ? <p className="pt-error">{error}</p> : null}
            <button className="pt-btn pt-btn--block" type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="pt-auth__switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>

        <span className="pt-powered pt-powered--light">
          Powered by{" "}
          <strong>
            <span className="pt-brand-apna">Apna</span>
            <span className="pt-brand-medi">Medi</span>
          </strong>
        </span>
      </div>
    </div>
  );
}
