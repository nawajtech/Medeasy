import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCentres } from "../api/portal";
import { getApiErrorMessage } from "../../utils/apiError";
import { usePatientAuth } from "../auth/PatientAuthContext";

export default function Centres() {
  const { patient } = usePatientAuth();
  const [search, setSearch] = useState("");
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await listCentres({ search: search.trim() || undefined });
        if (active) setCentres(data?.data ?? []);
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
  }, [search]);

  const firstName = patient?.name?.split(" ")?.[0] || "there";

  return (
    <div>
      <div className="pt-page-head">
        <h1 className="pt-page-title">Hi {firstName}, find a centre</h1>
        <p className="pt-page-sub">Search diagnostic centres and book tests or sample collection.</p>
      </div>

      <div className="pt-search">
        <input
          type="search"
          enterKeyHint="search"
          placeholder="Search by name, city, or address"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search diagnostic centres"
        />
      </div>

      {error ? <p className="pt-error">{error}</p> : null}
      {loading ? (
        <div className="pt-empty">Loading centres…</div>
      ) : centres.length === 0 ? (
        <div className="pt-empty">No diagnostic centres found. Try another search.</div>
      ) : (
        <div className="pt-grid">
          {centres.map((centre) => (
            <Link key={centre.id} to={`/centres/${centre.id}`} className="pt-centre">
              <div className="pt-centre__top">
                <span className="pt-chip">Diagnostics</span>
              </div>
              <h3>{centre.name}</h3>
              <p>
                {[centre.address, centre.city, centre.state].filter(Boolean).join(", ") ||
                  "Address not listed"}
              </p>
              {centre.phone ? <p>{centre.phone}</p> : null}
              <span className="pt-centre__cta">View tests & book →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
