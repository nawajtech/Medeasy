import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getApiErrorMessage } from "../../utils/apiError";
import "./Login.css";

function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("super@medeasy.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        <h1>MedEasy</h1>
        <p>Healthcare SaaS — sign in to your account</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="login-hints">
          <p>
            <strong>Super Admin:</strong> super@medeasy.com / password
          </p>
          <p>
            <strong>Apollo Admin:</strong> admin@apollo.com / password
          </p>
          <p>
            <strong>Apollo Doctor:</strong> doctor@apollo.com / password
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
