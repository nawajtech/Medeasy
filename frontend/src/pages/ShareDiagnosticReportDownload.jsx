import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../config/env";

/** Opens the public printable report (no login) then closes if opened as popup. */
function ShareDiagnosticReportDownload() {
  const { token } = useParams();

  useEffect(() => {
    if (!token) return;
    const url = `${API_BASE_URL}/public/share-report/${encodeURIComponent(token)}/download?print=1`;
    window.location.replace(url);
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Segoe UI, sans-serif", color: "#64748b" }}>
      Preparing report download…
    </div>
  );
}

export default ShareDiagnosticReportDownload;
