import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePartnerAuth } from "../auth/PartnerAuthContext";
import { AuthShell, Alert, LoadingBlock } from "../components/ui";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PartnerLogin() {
  const { login, isAuthenticated, loading: authLoading } = usePartnerAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) return <LoadingBlock label="Restoring session…" />;
  if (isAuthenticated) return <Navigate to="/" replace />;

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
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to connect with diagnostic centres and manage referrals."
      footer={
        <>
          <Link to="/forgot-password">Forgot password?</Link>
          {" · "}
          New partner? <Link to="/register">Create account</Link>
        </>
      }
    >
      <form className="pt-auth__form" onSubmit={handleSubmit}>
        <div className="pt-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@clinic.com"
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
        <Alert type="error">{error}</Alert>
        <button className="pt-btn pt-btn--block" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
