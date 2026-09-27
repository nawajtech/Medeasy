import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePatientAuth } from "../auth/PatientAuthContext";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PatientLogin() {
  const { login, isAuthenticated, loading: authLoading } = usePatientAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="pt-loading">
        <div className="pt-spinner" />
        <p>Restoring session…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed."));
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
          <h1>Welcome back</h1>
          <p className="pt-page-sub">Sign in to book diagnostic appointments and view reports.</p>

          <form className="pt-auth__form" onSubmit={handleSubmit}>
            <div className="pt-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="pt-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? <p className="pt-error">{error}</p> : null}
            <button className="pt-btn pt-btn--block" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="pt-auth__switch">
            New patient? <Link to="/register">Create an account</Link>
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
