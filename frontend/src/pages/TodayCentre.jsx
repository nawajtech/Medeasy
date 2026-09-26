import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTodayCentre } from "../api/todayCentre";
import CompanySelect from "../components/CompanySelect";
import BranchSelect from "../components/BranchSelect";
import Can from "../components/Can";
import { useAuth } from "../auth/AuthContext";
import { formatCurrency } from "../config/currency";
import { PERMISSIONS } from "../config/permissions";
import { getApiErrorMessage } from "../utils/apiError";
import "../components/crud/crud.css";
import "./TodayCentre.css";

const REFRESH_MS = 45000;

const STATUS_LABELS = {
  booked: "Booked",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  not_present: "Not present",
  cancelled: "Cancelled",
  ongoing: "Ongoing",
  pending_approval: "Pending approval",
  pending: "Pending",
  partial: "Partial",
  paid: "Paid",
};

function formatClock(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function TodayCentre() {
  const { user, isSuperAdmin } = useAuth();
  const [companyId, setCompanyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const params = {};
      if (isSuperAdmin && companyId) params.company_id = companyId;
      if (branchId) params.branch_id = branchId;
      const { data: payload } = await getTodayCentre(params);
      setData(payload);
      setLastUpdated(new Date());
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load Today's Centre."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [branchId, companyId, isSuperAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load({ silent: true }), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const summary = data?.summary || {};
  const access = data?.access || {};
  const dateLabel = data?.date
    ? new Date(`${data.date}T12:00:00`).toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

  const cards = [
    {
      key: "appointments",
      label: "Today's Appointments",
      value: summary.appointments_today ?? 0,
      hint: "Clinic / centre visits today",
      show: access.appointments || access.diagnostics,
    },
    {
      key: "walkins",
      label: "Walk-ins",
      value: summary.walk_ins ?? 0,
      hint: "Same-day unscheduled / walk-in",
      show: access.diagnostics,
    },
    {
      key: "patients",
      label: "Patients",
      value: summary.patients_today ?? 0,
      hint: "Registered today",
      show: access.patients,
    },
    {
      key: "reports",
      label: "Pending Reports",
      value: summary.pending_reports ?? 0,
      hint: "Awaiting approval",
      show: access.diagnostics,
      tone: summary.pending_reports > 0 ? "warn" : undefined,
    },
    {
      key: "collection",
      label: "Today's Collection",
      value: formatCurrency(summary.collection_today ?? 0, { decimals: 0 }),
      hint: "Cash / online collected today",
      show: access.diagnostics || access.billing,
    },
    {
      key: "dues",
      label: "Pending Payments",
      value: summary.pending_payments ?? 0,
      hint: "Orders with due balance",
      show: access.diagnostics,
      tone: summary.pending_payments > 0 ? "warn" : undefined,
    },
  ].filter((c) => c.show);

  return (
    <section className="page-card today-centre-page">
      <div className="page-card-header today-centre-header">
        <div>
          <h2>Today&apos;s Centre</h2>
          <p>Live operations board for queues, reports, and collections.</p>
        </div>
        <div className="today-centre-meta">
          <span className="today-centre-date">{dateLabel}</span>
          <span className="today-centre-updated">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "—"}
          </span>
        </div>
      </div>

      <div className="crud-toolbar today-centre-toolbar">
        <div className="tenant-toolbar-left">
          {isSuperAdmin && (
            <CompanySelect
              variant="inline"
              allowAll
              label="Clinic"
              id="today_centre_company"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setBranchId("");
              }}
              required={false}
            />
          )}
          <BranchSelect
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            companyId={isSuperAdmin ? companyId : user?.company_id || ""}
            allLabel="All branches"
            id="today_centre_branch"
            name="today_centre_branch"
            className="audit-trail-control"
          />
        </div>
        <div className="crud-toolbar-actions today-centre-actions">
          <button type="button" className="crud-btn crud-btn--ghost" onClick={() => load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      {loading && !data ? (
        <div className="today-centre-empty">Loading today&apos;s centre…</div>
      ) : (
        <>
          <div className="today-centre-cards">
            {cards.map((card) => (
              <article key={card.key} className={`today-centre-card${card.tone ? ` today-centre-card--${card.tone}` : ""}`}>
                <span className="today-centre-card-label">{card.label}</span>
                <strong className="today-centre-card-value">{card.value}</strong>
                <span className="today-centre-card-hint">{card.hint}</span>
              </article>
            ))}
          </div>

          {data?.alerts?.length > 0 && (
            <div className="today-centre-alerts" aria-label="Alerts">
              {data.alerts.map((alert) => (
                <Link
                  key={`${alert.type}-${alert.message}`}
                  to={alert.href || "/"}
                  className={`today-centre-alert today-centre-alert--${alert.level || "info"}`}
                >
                  {alert.message}
                </Link>
              ))}
            </div>
          )}

          <div className="today-centre-quick" aria-label="Quick actions">
            <h3>Quick actions</h3>
            <div className="today-centre-quick-row">
              <Can permission={PERMISSIONS.PATIENT_CREATE}>
                <Link className="crud-btn crud-btn--ghost" to="/patients">New Patient</Link>
              </Can>
              <Can permission={PERMISSIONS.APPOINTMENT_CREATE}>
                <Link className="crud-btn crud-btn--ghost" to="/appointments">New Booking</Link>
              </Can>
              <Can permission={PERMISSIONS.DIAGNOSTIC_VIEW}>
                <Link className="crud-btn crud-btn--ghost" to="/diagnostics/orders" state={{ openCreate: true }}>Walk-in / Orders</Link>
              </Can>
              <Can permission={PERMISSIONS.DIAGNOSTIC_VIEW}>
                <Link className="crud-btn crud-btn--ghost" to="/diagnostics">New Test</Link>
              </Can>
              <Can permission={PERMISSIONS.DIAGNOSTIC_VIEW}>
                <Link className="crud-btn crud-btn--ghost" to="/diagnostics/orders">Payment</Link>
              </Can>
              <Can permission={PERMISSIONS.DIAGNOSTIC_VIEW}>
                <Link className="crud-btn crud-btn--ghost" to="/diagnostics/orders?tab=completed">Reports</Link>
              </Can>
            </div>
          </div>

          <div className="today-centre-grid">
            {access.diagnostics && (
              <section className="today-centre-panel">
                <div className="today-centre-panel-head">
                  <h3>Today&apos;s Queue</h3>
                  <Link to="/diagnostics/orders">View all</Link>
                </div>
                <div className="crud-table-wrap">
                  <table className="crud-table">
                    <thead>
                      <tr>
                        <th>Token</th>
                        <th>Patient</th>
                        <th>Test / Service</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.queue || []).length === 0 && (
                        <tr><td colSpan={6} className="crud-empty">No queue items for today.</td></tr>
                      )}
                      {(data?.queue || []).map((row) => (
                        <tr key={row.id}>
                          <td>{row.token ?? "—"}</td>
                          <td>
                            <strong>{row.patient || "—"}</strong>
                            {row.patient_code && <div className="crud-muted">{row.patient_code}</div>}
                          </td>
                          <td>{row.service || "—"}</td>
                          <td>{row.time || "—"}</td>
                          <td><span className={`today-pill today-pill--${row.status}`}>{STATUS_LABELS[row.status] || row.status}</span></td>
                          <td className="today-centre-row-actions">
                            <Link className="crud-btn crud-btn--ghost crud-btn--sm" to={`/diagnostics/orders`}>Open</Link>
                            {row.patient_id && (
                              <Link className="crud-btn crud-btn--ghost crud-btn--sm" to={`/patients/${row.patient_id}`}>Patient</Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {access.appointments && (
              <section className="today-centre-panel">
                <div className="today-centre-panel-head">
                  <h3>Today&apos;s Appointments</h3>
                  <Link to="/appointments">View all</Link>
                </div>
                <div className="crud-table-wrap">
                  <table className="crud-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Time</th>
                        <th>Doctor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.appointments || []).length === 0 && (
                        <tr><td colSpan={4} className="crud-empty">No clinic appointments today.</td></tr>
                      )}
                      {(data?.appointments || []).map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.patient || "—"}</strong>
                            {row.patient_code && <div className="crud-muted">{row.patient_code}</div>}
                          </td>
                          <td>{row.time || formatClock(row.scheduled_at)}</td>
                          <td>{row.doctor || "—"}</td>
                          <td><span className={`today-pill today-pill--${row.status}`}>{STATUS_LABELS[row.status] || row.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {access.diagnostics && (
              <section className="today-centre-panel">
                <div className="today-centre-panel-head">
                  <h3>Reports needing attention</h3>
                  <Link to="/diagnostics/orders?tab=completed">Open reports</Link>
                </div>
                <div className="crud-table-wrap">
                  <table className="crud-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Test</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.reports || []).length === 0 && (
                        <tr><td colSpan={4} className="crud-empty">No pending report approvals.</td></tr>
                      )}
                      {(data?.reports || []).map((row) => (
                        <tr key={row.id}>
                          <td>{row.patient || "—"}</td>
                          <td>{row.service || "—"}</td>
                          <td><span className="today-pill today-pill--pending_approval">Pending approval</span></td>
                          <td className="today-centre-row-actions">
                            <Link className="crud-btn crud-btn--ghost crud-btn--sm" to="/diagnostics/orders?tab=completed">Review</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {(access.diagnostics || access.billing) && (
              <section className="today-centre-panel">
                <div className="today-centre-panel-head">
                  <h3>Payments</h3>
                  <span className="crud-muted">
                    Collected today: <strong>{formatCurrency(data?.payments?.collected_today ?? 0)}</strong>
                    {" · "}
                    Due: <strong>{formatCurrency(data?.payments?.pending_due_total ?? 0)}</strong>
                  </span>
                </div>
                <div className="crud-table-wrap">
                  <table className="crud-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Service</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.payments?.pending_orders || []).length === 0 && (
                        <tr><td colSpan={5} className="crud-empty">No pending diagnostic payments.</td></tr>
                      )}
                      {(data?.payments?.pending_orders || []).map((row) => (
                        <tr key={row.id}>
                          <td>{row.patient || "—"}</td>
                          <td>{row.service || "—"}</td>
                          <td>{formatCurrency(row.due_amount)}</td>
                          <td><span className={`today-pill today-pill--${row.payment_status}`}>{STATUS_LABELS[row.payment_status] || row.payment_status}</span></td>
                          <td className="today-centre-row-actions">
                            <Link className="crud-btn crud-btn--ghost crud-btn--sm" to="/diagnostics/orders">Collect</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default TodayCentre;
