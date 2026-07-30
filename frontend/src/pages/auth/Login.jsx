import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getPlatformBranding } from "../../api/platformSettings";
import { getHomePath } from "../../config/permissions";
import { applyDocumentBranding } from "../../utils/branding";
import { getApiErrorMessage } from "../../utils/apiError";
import { IconHeartPulse, IconLock, IconUser } from "../../components/icons";
import "./Login.css";

function Login() {
  const { login, isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState({
    name: "ApnaMedi",
    logo: null,
    tagline: "Healthcare Operations, Simplified",
  });

  useEffect(() => {
    let active = true;
    getPlatformBranding()
      .then(({ data }) => {
        if (!active || !data) return;
        const next = {
          name: data.name || "ApnaMedi",
          logo: data.logo || null,
          tagline: data.tagline || "Healthcare Operations, Simplified",
        };
        setBrand(next);
        applyDocumentBranding({ name: next.name, favicon: data.favicon || data.logo });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-backdrop" aria-hidden="true" />
        <div className="login-shell">
          <div className="login-card login-card--loading">
            <div className="login-spinner" aria-hidden="true" />
            <p>Restoring session…</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getHomePath(user)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const nextUser = await login(email, password);
      navigate(getHomePath(nextUser));
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-backdrop" aria-hidden="true" />

      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
            {brand.logo ? (
              <div className="login-brand-logo">
                <img src={brand.logo} alt="" />
              </div>
            ) : (
              <div className="login-brand-mark" aria-hidden="true">
                <IconHeartPulse size={28} />
              </div>
            )}
            <h1 className="login-brand-name">{brand.name}</h1>
            <p className="login-brand-tagline">{brand.tagline}</p>
          </div>

          <div className="login-divider">
            <span>Sign in to continue</span>
          </div>

          {error ? <div className="login-error" role="alert">{error}</div> : null}

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span className="login-field-label">Email</span>
              <span className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <IconUser size={18} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@clinic.com"
                  required
                  autoComplete="username"
                />
              </span>
            </label>

            <label className="login-field">
              <span className="login-field-label">Password</span>
              <span className="login-input-wrap">
                <span className="login-input-icon" aria-hidden="true">
                  <IconLock size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </span>
            </label>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="login-footer">Secure clinic access · {brand.name}</p>
      </div>
    </div>
  );
}

export default Login;
