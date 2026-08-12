import { useEffect, useState } from "react";
import { listReports } from "../api/portal";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PatientReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await listReports();
        if (active) setReports(data?.data ?? []);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load reports."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <div className="pt-page-head">
        <h1 className="pt-page-title">Reports</h1>
        <p className="pt-page-sub">Approved lab and diagnostic reports from your visits.</p>
      </div>

      {error ? <p className="pt-error">{error}</p> : null}
      {loading ? (
        <div className="pt-empty">Loading…</div>
      ) : reports.length === 0 ? (
        <div className="pt-empty">No approved reports yet.</div>
      ) : (
        <div>
          {reports.map((report) => (
            <article className="pt-appt-card" key={report.order_id}>
              <div className="pt-appt-card__head">
                <strong>{report.test_name || "Report"}</strong>
                <span className="pt-chip">Approved</span>
              </div>
              <div className="pt-appt-card__meta">
                {report.centre}
                {report.approved_at ? ` · ${new Date(report.approved_at).toLocaleDateString()}` : ""}
              </div>
              <div className="pt-appt-card__actions">
                <span className="pt-page-sub" style={{ margin: 0 }}>
                  {report.order_number}
                </span>
                {report.share_url ? (
                  <a
                    className="pt-btn pt-btn--ghost pt-btn--sm"
                    href={report.share_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View report
                  </a>
                ) : (
                  <span className="pt-status">Unavailable</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
