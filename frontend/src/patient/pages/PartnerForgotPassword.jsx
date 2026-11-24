import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { usePartnerAuth } from "../auth/PartnerAuthContext";
import { partnerForgotPassword, partnerResetPassword } from "../api/portal";
import { AuthShell, Alert, LoadingBlock, Stepper } from "../components/ui";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PartnerForgotPassword() {
  const { isAuthenticated, loading: authLoading } = usePartnerAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (authLoading) return <LoadingBlock label="Restoring session…" />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await partnerForgotPassword({ email: email.trim() });
      setInfo(data?.message || "If registered, a verification code was sent to your email.");
      setStep(2);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not send verification email."));
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await partnerResetPassword({
        email: email.trim(),
        otp: otp.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Password reset failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your registered email to receive a verification code."
      footer={<Link to="/login">Back to sign in</Link>}
    >
      {!done ? <Stepper step={step} steps={["Email", "New password"]} /> : null}

      {done ? (
        <>
          <Alert type="success">Password updated. You can sign in now.</Alert>
          <Link className="pt-btn pt-btn--block" to="/login">
            Back to sign in
          </Link>
        </>
      ) : step === 1 ? (
        <form className="pt-auth__form" onSubmit={sendOtp}>
          <div className="pt-field">
            <label htmlFor="email">Registered email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <Alert type="error">{error}</Alert>
          <button className="pt-btn pt-btn--block" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send email code"}
          </button>
        </form>
      ) : (
        <form className="pt-auth__form" onSubmit={reset}>
          <Alert type="info">{info || `Enter the code sent to ${email}`}</Alert>
          <div className="pt-field">
            <label htmlFor="otp">Email verification code</label>
            <input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>
          <div className="pt-field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="pt-field">
            <label htmlFor="password_confirmation">Confirm password</label>
            <input
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Alert type="error">{error}</Alert>
          <button className="pt-btn pt-btn--block" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Reset password"}
          </button>
          <button
            type="button"
            className="pt-btn pt-btn--ghost pt-btn--block"
            onClick={sendOtp}
            disabled={loading}
          >
            Resend email code
          </button>
        </form>
      )}
    </AuthShell>
  );
}
