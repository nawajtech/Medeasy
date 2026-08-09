import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE_URL } from "../config/env";
import "./ShareDiagnosticReport.css";

/** Prefer live API host so public report works even if SPA env is wrong. */
function publicApiBase() {
  const configured = (API_BASE_URL || "").replace(/\/$/, "");
  if (configured.includes("apnamedi.com") || configured.includes("127.0.0.1") || configured.includes("localhost")) {
    return configured;
  }
  return "https://app.apnamedi.com/api";
}

function ShareDiagnosticReport() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const apiBase = useMemo(() => publicApiBase(), []);

  const downloadHref = useMemo(() => {
    if (!token) return "#";
    return `${apiBase}/public/share-report/${encodeURIComponent(token)}/download?print=1`;
  }, [apiBase, token]);

  const viewHref = useMemo(() => {
    if (!token) return "#";
    return `${apiBase}/public/share-report/${encodeURIComponent(token)}/download`;
  }, [apiBase, token]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setError("Invalid report link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${apiBase}/public/share-report/${encodeURIComponent(token)}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Report not found." : "Unable to load report.");
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [apiBase, token]);

  const brandInitials = (data?.branding?.name || "AM").slice(0, 2).toUpperCase();

  return (
    <div className="share-rx-page">
      <div className="share-rx-wrap">
        <div className="share-rx-brand">
          {data?.branding?.logo ? (
            <img src={data.branding.logo} alt={data.branding.name || "Clinic"} className="share-rx-logo" />
          ) : (
            <div className="share-rx-logo-fallback">{brandInitials}</div>
          )}
        </div>

        {loading ? (
          <div className="share-rx-status">Loading report…</div>
        ) : error ? (
          <div className="share-rx-status share-rx-status--error">{error}</div>
        ) : data ? (
          <>
            <div className="share-rx-hero">
              <h1>{data.patient_headline}</h1>
              <div className="share-rx-study">{data.service_name}</div>
              <div className="share-rx-pid">
                Patient ID: <strong>{data.patient_code || "—"}</strong>
              </div>
            </div>

            <div className="share-rx-details">
              <div className="share-rx-row">
                <span>Sex/Age/Modality</span>
                <strong>{data.patient_age_sex_short}</strong>
              </div>
              <div className="share-rx-row">
                <span>Report Id</span>
                <strong>{data.report_id}</strong>
              </div>
              <div className="share-rx-row">
                <span>Report</span>
                <strong>{data.test_name}</strong>
              </div>
              <div className="share-rx-row">
                <span>Ref. physician</span>
                <strong>{data.referred_by || "—"}</strong>
              </div>
              <div className="share-rx-row">
                <span>Study Date/Time</span>
                <strong>{data.study_at_label}</strong>
              </div>
              <div className="share-rx-row">
                <span>Report Date/Time</span>
                <strong>{data.report_at_label}</strong>
              </div>
            </div>

            <div className="share-rx-actions">
              <p>Please download or view your report from here</p>
              {data.has_report ? (
                <>
                  <a className="share-rx-btn share-rx-btn--download" href={downloadHref} target="_blank" rel="noopener noreferrer">
                    Download Report
                  </a>
                  <a className="share-rx-btn share-rx-btn--view" href={viewHref} target="_blank" rel="noopener noreferrer">
                    View Report Card
                  </a>
                </>
              ) : (
                <>
                  <button type="button" className="share-rx-btn share-rx-btn--download" disabled>
                    Download Report
                  </button>
                  <button type="button" className="share-rx-btn share-rx-btn--view" disabled>
                    View Report Card
                  </button>
                  <div className="share-rx-note">Report is being prepared. Please check back shortly.</div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="share-rx-status share-rx-status--error">Report not found.</div>
        )}

        <div className="share-rx-secure">
          <div className="share-rx-secure-icon" aria-hidden="true">
            ✓
          </div>
          <div>
            <strong>Secured By {data?.branding?.name || "ApnaMedi"}</strong>
            <span>Trusted digital diagnostic report</span>
          </div>
        </div>
      </div>
      <p className="share-rx-home">
        <Link to="/login">Staff login</Link>
      </p>
    </div>
  );
}

export default ShareDiagnosticReport;
