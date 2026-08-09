import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../config/env";

function publicApiBase() {
  const configured = (API_BASE_URL || "").replace(/\/$/, "");
  if (configured.includes("apnamedi.com") || configured.includes("127.0.0.1") || configured.includes("localhost")) {
    return configured;
  }
  return "https://app.apnamedi.com/api";
}

/** Opens the public printable report (no login). */
function ShareDiagnosticReportDownload() {
  const { token } = useParams();

  useEffect(() => {
    if (!token) return;
    const url = `${publicApiBase()}/public/share-report/${encodeURIComponent(token)}/download?print=1`;
    window.location.replace(url);
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Segoe UI, sans-serif", color: "#64748b" }}>
      Preparing report download…
    </div>
  );
}

export default ShareDiagnosticReportDownload;
