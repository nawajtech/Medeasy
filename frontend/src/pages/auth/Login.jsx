import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { requestPasswordOtp, resetForgottenPassword, verifyPasswordOtp } from "../../api/auth";
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
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [view, setView] = useState("login");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [cooldownEmail, setCooldownEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState({
    name: "ApnaMedi",
    logo: null,
    tagline: "Healthcare Operations, Simplified",
  });

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCooldown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

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

  const openForgot = () => {
    setView("email");
    setError("");
    setNotice("");
    setOtp("");
    setPassword("");
    setPasswordConfirm("");
    setResetToken("");
  };

  const backToLogin = (message = "") => {
    setView("login");
    setError("");
    setNotice(typeof message === "string" ? message : "");
    setOtp("");
    setPassword("");
    setPasswordConfirm("");
    setResetToken("");
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const { data } = await requestPasswordOtp(email.trim());
      setView("otp");
      setOtp("");
      setNotice(data?.message || "A verification code was sent to your email.");
      setCooldownEmail(email.trim().toLowerCase());
      setCooldown(60);
    } catch (err) {
      const retry = Number(err?.response?.data?.retry_after);
      if (retry > 0) {
        setCooldownEmail(email.trim().toLowerCase());
        setCooldown(retry);
      }
      setError(getApiErrorMessage(err, "Could not send the verification code."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const { data } = await verifyPasswordOtp({ email: email.trim(), otp: otp.trim() });
      setResetToken(data.reset_token);
      setPassword("");
      setPasswordConfirm("");
      setView("password");
      setNotice("Code verified. Choose a new password.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not verify that code."));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const { data } = await resetForgottenPassword({
        email: email.trim(),
        reset_token: resetToken,
        password,
        password_confirmation: passwordConfirm,
      });
      backToLogin(data?.message || "Password updated. You can sign in with your new password.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not update the password."));
    } finally {
      setLoading(false);
    }
  };

  const sendBlocked = cooldown > 0 && email.trim().toLowerCase() === cooldownEmail;

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
            <span>
              {view === "login" && "Sign in to continue"}
              {view === "email" && "Reset your password"}
              {view === "otp" && "Enter the code"}
              {view === "password" && "Choose a new password"}
            </span>
          </div>

          {error ? <div className="login-error" role="alert">{error}</div> : null}
          {notice ? <div className="login-success" role="status">{notice}</div> : null}

          {view === "login" ? (
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

            <div className="login-row">
              <button type="button" className="login-link" onClick={openForgot}>
                Forgot password?
              </button>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          ) : null}

          {view === "email" ? (
            <form className="login-form" onSubmit={handleSendOtp}>
              <p className="login-hint">
                Enter the email on your account. We will send a 6-digit code to verify it.
              </p>
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
              <button type="submit" className="login-submit" disabled={loading || sendBlocked}>
                {loading ? "Sending…" : sendBlocked ? `Resend in ${cooldown}s` : "Send code"}
              </button>
              <button type="button" className="login-link login-link--center" onClick={backToLogin}>
                Back to sign in
              </button>
            </form>
          ) : null}

          {view === "otp" ? (
            <form className="login-form" onSubmit={handleVerifyOtp}>
              <p className="login-hint">
                Enter the 6-digit code sent to <strong>{email}</strong>. It expires in 10 minutes.
              </p>
              <label className="login-field">
                <span className="login-field-label">Verification code</span>
                <input
                  className="login-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                />
              </label>
              <button type="submit" className="login-submit" disabled={loading || otp.length !== 6}>
                {loading ? "Verifying…" : "Verify code"}
              </button>
              <button
                type="button"
                className="login-link login-link--center"
                onClick={handleSendOtp}
                disabled={loading || sendBlocked}
              >
                {sendBlocked ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button type="button" className="login-link login-link--center" onClick={backToLogin}>
                Back to sign in
              </button>
            </form>
          ) : null}

          {view === "password" ? (
            <form className="login-form" onSubmit={handleResetPassword}>
              <p className="login-hint">Choose a new password for {email}. Use at least 8 characters.</p>
              <label className="login-field">
                <span className="login-field-label">New password</span>
                <span className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">
                    <IconLock size={18} />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </span>
              </label>
              <label className="login-field">
                <span className="login-field-label">Confirm password</span>
                <span className="login-input-wrap">
                  <span className="login-input-icon" aria-hidden="true">
                    <IconLock size={18} />
                  </span>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </span>
              </label>
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </button>
              <button type="button" className="login-link login-link--center" onClick={backToLogin}>
                Back to sign in
              </button>
            </form>
          ) : null}
        </div>

        <p className="login-footer">Secure clinic access · {brand.name}</p>
      </div>
    </div>
  );
}

export default Login;
