import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listReferrals, listRelationships } from "../api/portal";
import {
  Alert,
  CardList,
  EmptyState,
  ListRow,
  LoadingBlock,
  PageHeader,
  StatusBadge,
  Toolbar,
} from "../components/ui";
import { formatDateTime, money } from "../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";

export default function MyReferrals() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [centres, setCentres] = useState([]);
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listRelationships()
      .then(({ data }) => setCentres(data?.data ?? []))
      .catch(() => setCentres([]));
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await listReferrals({
          search: search.trim() || undefined,
          status: status || undefined,
          company_id: companyId || undefined,
          page,
          per_page: 20,
        });
        if (!active) return;
        setOrders(data?.data ?? []);
        setMeta(data?.meta ?? null);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load referrals."));
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, status, companyId, page]);

  return (
    <div>
      <PageHeader
        title="My Referrals"
        subtitle="Track referral bookings, appointment status, and commission eligibility."
        actions={
          <Link to="/centres" className="pt-btn">
            New referral
          </Link>
        }
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
              placeholder="Search booking ID or patient"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              aria-label="Search booking ID or patient"
            />
          </label>
          <label className="pt-filter-field">
            <span className="pt-filter-field__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <select
              value={companyId}
              onChange={(e) => {
                setPage(1);
                setCompanyId(e.target.value);
              }}
              aria-label="Filter by centre"
            >
              <option value="">All centres</option>
              {centres.map((c) => (
                <option key={c.relationship_id} value={c.company_id}>
                  {c.centre?.name || `Centre #${c.company_id}`}
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
            <select
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      </Toolbar>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <LoadingBlock label="Loading referrals…" />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No referrals yet"
          text="Once a centre approves your partnership, you can refer patients here."
          action={
            <Link to="/centres" className="pt-btn">
              Explore centres
            </Link>
          }
        />
      ) : (
        <>
          <CardList>
            {orders.map((order) => (
              <ListRow
                key={order.id}
                to={`/referrals/${order.id}`}
                title={order.patient_name || "Patient"}
                meta={
                  <>
                    {order.booking_id} · {order.centre}
                    <div>{order.test_name}</div>
                    <div>Appointment: {formatDateTime(order.appointment_date)}</div>
                  </>
                }
                right={
                  <>
                    <StatusBadge status={order.status} />
                    <StatusBadge status={order.commission_status} />
                    {order.commission_amount > 0 ? (
                      <strong>{money(order.commission_amount)}</strong>
                    ) : null}
                  </>
                }
              />
            ))}
          </CardList>

          {meta && meta.last_page > 1 ? (
            <div className="pt-pagination">
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="pt-muted">
                Page {meta.current_page} / {meta.last_page}
              </span>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
