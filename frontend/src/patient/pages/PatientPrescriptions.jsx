import { useEffect, useState } from "react";
import { listPrescriptions } from "../api/portal";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PatientPrescriptions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await listPrescriptions();
        if (active) setItems(data?.data ?? []);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load prescriptions."));
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
        <h1 className="pt-page-title">Prescriptions</h1>
        <p className="pt-page-sub">Prescriptions linked to your visits, when available.</p>
      </div>

      {error ? <p className="pt-error">{error}</p> : null}
      {loading ? (
        <div className="pt-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="pt-empty">No prescriptions available yet.</div>
      ) : (
        <div className="pt-list">
          {items.map((item) => (
            <article className="pt-panel" key={`${item.source}-${item.id}`}>
              <div className="pt-appt-card__head">
                <strong>{item.doctor || item.test_name || "Prescription"}</strong>
                <span className="pt-chip">{item.source}</span>
              </div>
              <div className="pt-appt-card__meta" style={{ margin: "8px 0 12px" }}>
                {item.centre}
                {item.date ? ` · ${new Date(item.date).toLocaleDateString()}` : ""}
              </div>
              {item.prescription ? (
                <p style={{ whiteSpace: "pre-wrap", margin: "0 0 12px", lineHeight: 1.5 }}>
                  {item.prescription}
                </p>
              ) : null}
              {item.prescription_file_url ? (
                <a
                  className="pt-btn pt-btn--ghost pt-btn--sm"
                  href={item.prescription_file_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open file
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
