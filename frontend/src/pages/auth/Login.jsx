import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getPlatformBranding } from "../../api/platformSettings";
import { applyDocumentBranding } from "../../utils/branding";
import { getApiErrorMessage } from "../../utils/apiError";
import "./Login.css";

function Login() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState({
    name: "ApnaMedi",
    logo: null,
    tagline: "Healthcare SaaS — sign in to your account",
  });

  useEffect(() => {
    let active = true;
    getPlatformBranding()
      .then(({ data }) => {
        if (!active || !data) return;
        const next = {
          name: data.name || "ApnaMedi",
          logo: data.logo || null,
          tagline: data.tagline
            ? `${data.tagline} — sign in to your account`
            : "Healthcare SaaS — sign in to your account",
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
        <div className="login-card">
          <p>Restoring session…</p>
        </div>
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
    <div className="login-page">
      <div className="login-card">
        {brand.logo ? (
          <div className="login-brand-logo">
            <img src={brand.logo} alt={brand.name} />
          </div>
        ) : null}
        <h1>{brand.name}</h1>
        <p>{brand.tagline}</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="username"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
