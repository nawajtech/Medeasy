import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [centres, setCentres] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);
  const [chatActingId, setChatActingId] = useState(null);
  const [modalCentre, setModalCentre] = useState(null);
  const [message, setMessage] = useState("We would like to refer patients for diagnostics.");

  const hasFilters = Boolean(search.trim() || city || category.trim());

  const clearFilters = () => {
    setSearch("");
    setCity("");
    setCategory("");
  };

  const openChat = (centre) => {
    setChatActingId(centre.id);
    navigate(`/chats?company_id=${centre.id}`);
  };

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

  const partnershipAction = (centre) => {
    if (centre.partnership_status === "approved") {
      return (
        <Link to={`/centres/${centre.id}/book`} className="pt-btn pt-btn--sm">
          Refer patient
        </Link>
      );
    }
    if (centre.partnership_status === "pending") {
      return (
        <button type="button" className="pt-btn pt-btn--sm pt-btn--status" disabled>
          Request pending
        </button>
      );
    }
    return (
      <button
        type="button"
        className="pt-btn pt-btn--sm"
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
    );
  };

  return (
    <div>
      <PageHeader
        title="Explore Diagnostic Centres"
        subtitle="Find centres, review services, and request referral partnerships."
      />

      <Toolbar>
        <div className="pt-toolbar__row pt-toolbar__row--filters">
          <label className="pt-filter-field pt-filter-field--search">
            <span className="pt-filter-field__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16.2 16.2 3.3 3.3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Search by centre name or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search by centre name or location"
            />
          </label>

          <label className="pt-filter-field">
            <span className="pt-filter-field__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" strokeLinejoin="round" />
                <circle cx="12" cy="11" r="2.2" />
              </svg>
            </span>
            <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter by city">
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="pt-filter-field">
            <span className="pt-filter-field__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Diagnostic category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by diagnostic category"
            />
          </label>

          {hasFilters ? (
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm pt-toolbar__clear" onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      </Toolbar>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <LoadingBlock label="Loading centres…" />
      ) : centres.length === 0 ? (
        <EmptyState
          title="No centres found"
          text="Try a different city, category, or search term."
          action={
            hasFilters ? (
              <button type="button" className="pt-btn pt-btn--ghost" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null
          }
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
                <div className="pt-centre-card__title">
                  <div className="pt-centre-card__title-row">
                    <h2>{centre.name}</h2>
                    <StatusBadge status={centre.partnership_status || "available"} />
                  </div>
                  <p className="pt-centre-card__location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" strokeLinejoin="round" />
                      <circle cx="12" cy="11" r="2.2" />
                    </svg>
                    {[centre.city, centre.state].filter(Boolean).join(", ") || "Location on request"}
                  </p>
                </div>
              </div>

              <div className="pt-centre-card__meta">
                <span className="pt-chip">
                  {centre.branch_count || 0} branch{(centre.branch_count || 0) === 1 ? "" : "es"}
                </span>
                {centre.referral_code ? (
                  <span className="pt-chip pt-chip--code">
                    Code <strong>{centre.referral_code}</strong>
                  </span>
                ) : null}
              </div>

              {centre.categories?.length ? (
                <div className="pt-centre-card__categories" aria-label="Available categories">
                  {centre.categories.slice(0, 4).map((cat) => (
                    <span key={cat} className="pt-chip pt-chip--soft">
                      {cat}
                    </span>
                  ))}
                  {centre.categories.length > 4 ? (
                    <span className="pt-chip pt-chip--soft">+{centre.categories.length - 4}</span>
                  ) : null}
                </div>
              ) : (
                <p className="pt-muted pt-centre-card__empty-cats">Categories available on request</p>
              )}

              <div className="pt-centre-card__actions">
                <Link to={`/centres/${centre.id}`} className="pt-btn pt-btn--ghost pt-btn--sm">
                  View details
                </Link>
                <button
                  type="button"
                  className="pt-btn pt-btn--ghost pt-btn--sm"
                  disabled={chatActingId === centre.id}
                  onClick={() => openChat(centre)}
                >
                  {chatActingId === centre.id ? "Opening…" : "Chat"}
                </button>
                {partnershipAction(centre)}
              </div>
            </article>
          ))}
        </div>
      )}

      {modalCentre ? (
        <div className="pt-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="request-partnership-title">
          <div className="pt-modal">
            <h3 id="request-partnership-title">Request partnership</h3>
            <p>
              Send a short introduction to <strong>{modalCentre.name}</strong>. The centre will review and share a
              referral code after approval.
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
