import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listAppointments, listCentres } from "../api/portal";
import { getApiErrorMessage } from "../../utils/apiError";
import { usePatientAuth } from "../auth/PatientAuthContext";

export default function Centres() {
  const { patient } = usePatientAuth();
  const [search, setSearch] = useState("");
  const [centres, setCentres] = useState([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bookRef = useRef(null);

  useEffect(() => {
    let active = true;
    listAppointments({ scope: "upcoming" })
      .then(({ data }) => {
        if (active) setUpcomingCount((data?.data ?? []).length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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

  const scrollToBook = () => {
    bookRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      <section className="pt-hero" aria-label="Book appointment">
        <div className="pt-hero__inner">
          <p className="pt-hero__eyebrow">Diagnostic appointments</p>
          <h1>Hi {firstName}, book your next visit in minutes</h1>
          <p>
            Find a diagnostic centre, choose tests, pick a slot, and confirm — online pay or pay on
            visit. Reports and prescriptions stay in one place.
          </p>
          <div className="pt-hero__actions">
            <button type="button" className="pt-hero__btn" onClick={scrollToBook}>
              Book appointment
            </button>
            <Link to="/appointments" className="pt-hero__btn pt-hero__btn--ghost">
              My bookings{upcomingCount > 0 ? ` (${upcomingCount})` : ""}
            </Link>
          </div>
        </div>
      </section>

      <div className="pt-quick-row">
        <Link to="/appointments" className="pt-quick pt-quick--blue">
          <strong>Upcoming visits</strong>
          <span>
            {upcomingCount > 0
              ? `${upcomingCount} booking${upcomingCount === 1 ? "" : "s"} scheduled`
              : "No upcoming bookings yet"}
          </span>
        </Link>
        <Link to="/reports" className="pt-quick pt-quick--green">
          <strong>Lab reports</strong>
          <span>View approved diagnostic results anytime</span>
        </Link>
      </div>

      <div className="pt-section-head">
        <div>
          <h2>How booking works</h2>
          <p>Simple steps from search to confirmation</p>
        </div>
      </div>

      <div className="pt-steps">
        <div className="pt-step-card">
          <span className="pt-step-card__num">1</span>
          <div>
            <strong>Choose a centre</strong>
            <span>Search diagnostic centres near you</span>
          </div>
        </div>
        <div className="pt-step-card">
          <span className="pt-step-card__num">2</span>
          <div>
            <strong>Select tests & slot</strong>
            <span>Pick services and an available time</span>
          </div>
        </div>
        <div className="pt-step-card">
          <span className="pt-step-card__num">3</span>
          <div>
            <strong>Pay & confirm</strong>
            <span>Pay online or pay when you visit</span>
          </div>
        </div>
      </div>

      <div className="pt-section-head" ref={bookRef} id="book">
        <div>
          <h2>Book a diagnostic centre</h2>
          <p>Start your appointment booking below</p>
        </div>
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
                <span className="pt-chip pt-chip--green">Book now</span>
              </div>
              <h3>{centre.name}</h3>
              <p>
                {[centre.address, centre.city, centre.state].filter(Boolean).join(", ") ||
                  "Address not listed"}
              </p>
              {centre.phone ? <p>{centre.phone}</p> : null}
              <span className="pt-centre__cta">Select tests & book →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
