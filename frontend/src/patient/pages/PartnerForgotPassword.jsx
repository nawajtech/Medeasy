import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { usePartnerAuth } from "../auth/PartnerAuthContext";
import { partnerForgotPassword, partnerResetPassword } from "../api/portal";
import { AuthShell, Alert, LoadingBlock, Stepper } from "../components/ui";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PartnerForgotPassword() {
  const { isAuthenticated, loading: authLoading } = usePartnerAuth();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [devOtp, setDevOtp] = useState("");
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
      const { data } = await partnerForgotPassword({ phone: phone.trim() });
      setInfo(data?.message || "If registered, an OTP was sent.");
      if (data?.dev_otp) setDevOtp(data.dev_otp);
      setStep(2);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not send OTP."));
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
        phone: phone.trim(),
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
      subtitle="Verify your registered mobile number to set a new password."
      footer={<Link to="/login">Back to sign in</Link>}
    >
      {!done ? <Stepper step={step} steps={["Mobile", "New password"]} /> : null}

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
            <label htmlFor="phone">Registered mobile</label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <Alert type="error">{error}</Alert>
          <button className="pt-btn pt-btn--block" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form className="pt-auth__form" onSubmit={reset}>
          <Alert type="info">{info}</Alert>
          {devOtp ? <Alert type="info">Dev OTP: {devOtp}</Alert> : null}
          <div className="pt-field">
            <label htmlFor="otp">OTP</label>
            <input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} />
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
        </form>
      )}
    </AuthShell>
  );
}
