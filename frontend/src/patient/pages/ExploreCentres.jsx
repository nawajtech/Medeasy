import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCentres, requestPartnership } from "../api/portal";
import {
  Alert,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatusBadge,
  Toolbar,
} from "../components/ui";
import { getApiErrorMessage } from "../../utils/apiError";

export default function ExploreCentres() {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [centres, setCentres] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [modalCentre, setModalCentre] = useState(null);
  const [message, setMessage] = useState("We would like to refer patients for diagnostics.");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await listCentres({
          search: search.trim() || undefined,
          city: city || undefined,
          category: category.trim() || undefined,
        });
        if (!active) return;
        setCentres(data?.data ?? []);
        setCities(data?.filters?.cities ?? []);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load centres."));
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, city, category]);

  const submitRequest = async () => {
    if (!modalCentre) return;
    setActingId(modalCentre.id);
    setError("");
    try {
      await requestPartnership({
        company_id: modalCentre.id,
        message: message.trim() || null,
      });
      setCentres((rows) =>
        rows.map((row) =>
          row.id === modalCentre.id ? { ...row, partnership_status: "pending" } : row
        )
      );
      setModalCentre(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not submit partnership request."));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Explore Diagnostic Centres"
        subtitle="Discover centres, review services, and request a referral partnership."
      />

      <Toolbar>
        <input
          type="search"
          placeholder="Search by centre name or location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="pt-toolbar__row">
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Filter by diagnostic category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
      </Toolbar>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <LoadingBlock label="Loading centres…" />
      ) : centres.length === 0 ? (
        <EmptyState
          title="No centres found"
          text="Try a different city, category, or search term."
        />
      ) : (
        <div className="pt-centre-grid">
          {centres.map((centre) => (
            <article key={centre.id} className="pt-centre-card">
              <div className="pt-centre-card__head">
                {centre.logo_url ? (
                  <img src={centre.logo_url} alt="" className="pt-centre-card__logo" />
                ) : (
                  <div className="pt-centre-card__logo pt-centre-card__logo--placeholder">
                    {(centre.name || "?").slice(0, 1)}
                  </div>
                )}
                <div>
                  <h2>{centre.name}</h2>
                  <p className="pt-muted" style={{ margin: "4px 0 0" }}>
                    {[centre.city, centre.state].filter(Boolean).join(", ") || "Location on request"}
                  </p>
                </div>
              </div>

              <div className="pt-chip-row">
                <span className="pt-chip">
                  {centre.branch_count || 0} branch{(centre.branch_count || 0) === 1 ? "" : "es"}
                </span>
                <StatusBadge status={centre.partnership_status || "available"} />
              </div>

              {centre.categories?.length ? (
                <p className="pt-muted" style={{ margin: 0 }}>
                  {centre.categories.slice(0, 4).join(" · ")}
                </p>
              ) : null}

              {centre.referral_code ? (
                <p className="pt-muted" style={{ margin: 0 }}>
                  Referral code: <strong>{centre.referral_code}</strong>
                </p>
              ) : null}

              <div className="pt-centre-card__actions">
                <Link to={`/centres/${centre.id}`} className="pt-btn pt-btn--ghost">
                  View details
                </Link>
                {centre.partnership_status === "approved" ? (
                  <Link to={`/centres/${centre.id}/book`} className="pt-btn">
                    Refer patient
                  </Link>
                ) : centre.partnership_status === "pending" ? (
                  <button type="button" className="pt-btn" disabled>
                    Request pending
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pt-btn"
                    disabled={actingId === centre.id}
                    onClick={() => {
                      setMessage("We would like to refer patients for diagnostics.");
                      setModalCentre(centre);
                    }}
                  >
                    {centre.partnership_status === "rejected" || centre.partnership_status === "suspended"
                      ? "Request again"
                      : "Request partnership"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {modalCentre ? (
        <div className="pt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="pt-modal">
            <h3>Request partnership</h3>
            <p>
              Send a short introduction to <strong>{modalCentre.name}</strong>. The centre will
              review and share a referral code after approval.
            </p>
            <div className="pt-field">
              <label htmlFor="request-message">Message</label>
              <textarea
                id="request-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="pt-modal__actions">
              <button type="button" className="pt-btn pt-btn--ghost" onClick={() => setModalCentre(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="pt-btn"
                disabled={actingId === modalCentre.id}
                onClick={submitRequest}
              >
                {actingId === modalCentre.id ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
