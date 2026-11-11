import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPartnerDashboard } from "../api/portal";
import { usePartnerAuth } from "../auth/PartnerAuthContext";
import {
  Alert,
  CardList,
  EmptyState,
  ListRow,
  LoadingBlock,
  Section,
  StatCard,
  StatGrid,
  StatusBadge,
  Toolbar,
} from "../components/ui";
import { formatDateTime, money } from "../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PartnerDashboard() {
  const { partner } = usePartnerAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCentreId, setActiveCentreId] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: res } = await getPartnerDashboard();
        if (!active) return;
        setData(res);
        const first = res?.centres?.[0]?.company_id;
        if (first) setActiveCentreId(String(first));
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load dashboard."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = data?.stats || {};
  const firstName = partner?.name?.split(" ")?.[0] || "Partner";

  return (
    <div>
      <section className="pt-dash-hero">
        <p className="pt-page-header__eyebrow" style={{ color: "rgba(255,255,255,0.85)" }}>
          ApnaMedi Partner Portal
        </p>
        <h1>Hi {firstName}, grow your referral network</h1>
        <p>Connect with diagnostic centres. Track referrals and earnings in one place.</p>
        <div className="pt-dash-hero__actions">
          <Link to="/centres" className="pt-btn">
            Explore centres
          </Link>
          {activeCentreId ? (
            <Link to={`/centres/${activeCentreId}/book`} className="pt-btn pt-btn--ghost">
              Refer a patient
            </Link>
          ) : (
            <Link to="/requests" className="pt-btn pt-btn--ghost">
              View requests
            </Link>
          )}
        </div>
      </section>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <LoadingBlock label="Loading dashboard…" />
      ) : (
        <>
          {(data?.centres || []).length > 0 ? (
            <Toolbar>
              <div className="pt-field" style={{ margin: 0 }}>
                <label htmlFor="active-centre">Active diagnostic centre</label>
                <select
                  id="active-centre"
                  value={activeCentreId}
                  onChange={(e) => setActiveCentreId(e.target.value)}
                >
                  {data.centres.map((c) => (
                    <option key={c.relationship_id} value={c.company_id}>
                      {c.centre_name} · {c.referral_code}
                    </option>
                  ))}
                </select>
              </div>
            </Toolbar>
          ) : null}

          <StatGrid>
            <StatCard tone="blue" label="Connected centres" value={stats.connected_centres ?? 0} to="/centres" />
            <StatCard tone="green" label="Pending requests" value={stats.pending_requests ?? 0} to="/requests" />
            <StatCard tone="blue" label="Total referrals" value={stats.total_referrals ?? 0} to="/referrals" />
            <StatCard
              tone="green"
              label="Pending earnings"
              value={money(stats.eligible_pending_earnings, { compact: true })}
              to="/earnings"
            />
            <StatCard label="Upcoming bookings" value={stats.upcoming_bookings ?? 0} to="/referrals" />
            <StatCard label="Completed referrals" value={stats.completed_referrals ?? 0} to="/referrals" />
            <StatCard label="Paid earnings" value={money(stats.paid_earnings, { compact: true })} to="/earnings" />
            <StatCard label="Approved partnerships" value={stats.approved_partnerships ?? 0} to="/requests" />
          </StatGrid>

          <Section
            title="Recent referrals"
            subtitle="Latest patients you referred"
            action={<Link to="/referrals">View all</Link>}
          >
            {(data?.recent_referrals || []).length === 0 ? (
              <EmptyState
                title="No referrals yet"
                text="Connect with a diagnostic centre, then book your first referral."
                action={
                  <Link to="/centres" className="pt-btn">
                    Explore centres
                  </Link>
                }
              />
            ) : (
              <CardList>
                {data.recent_referrals.map((row) => (
                  <ListRow
                    key={row.id}
                    to={`/referrals/${row.id}`}
                    title={row.patient_name || "Patient"}
                    meta={`${row.centre || "Centre"} · ${row.test_name || "Test"}`}
                    right={
                      <>
                        <StatusBadge status={row.status} />
                        <span className="pt-muted">{formatDateTime(row.appointment_date || row.booking_date)}</span>
                      </>
                    }
                  />
                ))}
              </CardList>
            )}
          </Section>

          <Section
            title="Recent partnership requests"
            subtitle="Status of your centre requests"
            action={<Link to="/requests">View all</Link>}
          >
            {(data?.recent_requests || []).length === 0 ? (
              <EmptyState
                title="No requests yet"
                text="Browse centres and send a partnership request to get started."
                action={
                  <Link to="/centres" className="pt-btn pt-btn--ghost">
                    Explore centres
                  </Link>
                }
              />
            ) : (
              <CardList>
                {data.recent_requests.map((row) => (
                  <ListRow
                    key={row.id}
                    title={row.company?.name || "Centre"}
                    meta={row.company?.city || "—"}
                    right={<StatusBadge status={row.status} />}
                  />
                ))}
              </CardList>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
