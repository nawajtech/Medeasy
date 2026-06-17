import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboard } from "../api/dashboard";
import { useAuth } from "../auth/AuthContext";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Dashboard.css";

const STATUS_COLORS = {
  scheduled: "#0d9488",
  confirmed: "#2563eb",
  completed: "#16a34a",
  cancelled: "#dc2626",
};

const CHART_TEAL = "#0d9488";
const CHART_BLUE = "#3b82f6";
const CHART_AMBER = "#f59e0b";
const DOCTOR_PERFORMANCE_PREVIEW = 5;

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: formatLocalDate(from), to: formatLocalDate(to) };
}

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatRupee(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRangeLabel(from, to) {
  if (!from || !to) return "";
  const opts = { month: "short", day: "numeric", year: "numeric" };
  return `${new Date(from).toLocaleDateString(undefined, opts)} – ${new Date(to).toLocaleDateString(undefined, opts)}`;
}

function DoctorPerformanceTable({ rows, showCompanyCol, startRank = 1 }) {
  if (!rows.length) return null;

  return (
    <div className="crud-table-wrap dashboard-doctor-table-wrap">
      <table className="crud-table dashboard-doctor-table">
        <thead>
          <tr>
            <th className="dashboard-doctor-rank-col" aria-label="Rank">
              #
            </th>
            {showCompanyCol && <th>Clinic</th>}
            <th>Doctor</th>
            <th className="dashboard-doctor-num">Patients</th>
            <th className="dashboard-doctor-num">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rank = startRank + index;
            const isTop = rank === 1;

            return (
              <tr key={row.doctor_id} className={isTop ? "is-top" : ""}>
                <td className="dashboard-doctor-rank-col">
                  <span className={`dashboard-doctor-rank ${rank <= 3 ? `is-rank-${rank}` : ""}`}>
                    {rank}
                  </span>
                </td>
                {showCompanyCol && <td>{row.company_name ?? "—"}</td>}
                <td>
                  <span className="dashboard-doctor-name">{row.doctor_name}</span>
                  {isTop && rows.length > 1 && (
                    <span className="dashboard-doctor-badge">Top earner</span>
                  )}
                </td>
                <td className="dashboard-doctor-num">{row.patients}</td>
                <td className="dashboard-doctor-num dashboard-doctor-revenue">
                  {formatRupee(row.revenue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard() {
  const { isSuperAdmin, isDoctor, isCompanyAdmin, isStaff } = useAuth();
  const showAdminPayments = !isDoctor && (isSuperAdmin || isCompanyAdmin || isStaff);

  const initialRange = useMemo(() => defaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [filterCompanyId, setFilterCompanyId] = useState("");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doctorPerformanceOpen, setDoctorPerformanceOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        date_from: dateFrom,
        date_to: dateTo,
      };
      if (isSuperAdmin && filterCompanyId) {
        params.company_id = filterCompanyId;
      }
      const res = await getDashboard(params);
      setData(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load dashboard."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, filterCompanyId, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDoctorPerformanceOpen(false);
  }, [dateFrom, dateTo, filterCompanyId]);

  const setPresetDays = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    setDateFrom(formatLocalDate(from));
    setDateTo(formatLocalDate(to));
  };

  if (loading && !data) {
    return <div className="dashboard-loading">Loading dashboard…</div>;
  }

  if (error && !data) {
    return <div className="dashboard-error">{error}</div>;
  }

  if (!data) return null;

  const { summary, appointments_by_status, appointments_by_month, billing_by_month, payment_overview } =
    data;
  const statusData = appointments_by_status.map((row) => ({
    name: row.status.charAt(0).toUpperCase() + row.status.slice(1),
    value: row.count,
    status: row.status,
  }));

  const showBillingChart = !isDoctor && billing_by_month.length > 0;
  const showCompaniesOverview = data.companies_overview?.length > 0;
  const showCompaniesPaymentGrid =
    isSuperAdmin && !filterCompanyId && data.companies_payment?.length > 0;

  const doctorPerformance = data.doctor_performance ?? [];
  const showDoctorCompanyCol = doctorPerformance.some((row) => row.company_name);
  const doctorPerformancePreview = doctorPerformance.slice(0, DOCTOR_PERFORMANCE_PREVIEW);
  const hasMoreDoctors = doctorPerformance.length > DOCTOR_PERFORMANCE_PREVIEW;
  const doctorRangeLabel = formatRangeLabel(data.date_range?.from, data.date_range?.to);

  const paymentCards = payment_overview
    ? [
        {
          key: "today",
          label: "Today's revenue",
          value: formatMoney(payment_overview.today_revenue),
          hint: "Payments received today",
          accent: true,
        },
        {
          key: "period",
          label: "Period revenue",
          value: formatMoney(payment_overview.period_revenue),
          hint: "Collected in selected range",
        },
        {
          key: "due",
          label: "Outstanding due",
          value: formatMoney(payment_overview.outstanding_due),
          hint: "Due on bills in range",
          warn: payment_overview.outstanding_due > 0,
        },
        {
          key: "rate",
          label: "Collection rate",
          value: formatPercent(payment_overview.collection_rate),
          hint: `Of ${formatMoney(payment_overview.period_total_billed)} billed`,
        },
      ]
    : [];

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-main">
          <h1>Dashboard</h1>
          <p>
            {isDoctor
              ? "Your appointments and assigned patients at a glance."
              : "Clinic analytics and payment overview for your organization."}
          </p>
          <span className="dashboard-scope-badge">
            Viewing: <strong>{data.scope_label}</strong>
          </span>
        </div>

        <div className="dashboard-filters">
          {isSuperAdmin && (
            <CompanySelect
              variant="inline"
              allowAll
              label="Clinic"
              id="dashboard_company_id"
              value={filterCompanyId}
              onChange={(e) => setFilterCompanyId(e.target.value)}
              required={false}
            />
          )}
          <div className="dashboard-date-range">
            {/* <span className="dashboard-date-range-label">Date range</span> */}
            <div className="dashboard-date-inputs">
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="From date"
              />
              <span className="dashboard-date-sep">to</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="To date"
              />
            </div>
            <div className="dashboard-date-presets">
              <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => setPresetDays(7)}>
                7 days
              </button>
              <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => setPresetDays(30)}>
                30 days
              </button>
              <button type="button" className="crud-btn crud-btn--ghost crud-btn--sm" onClick={() => setPresetDays(90)}>
                90 days
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      {showAdminPayments && paymentCards.length > 0 && (
        <section className="dashboard-payments-section">
          <div className="dashboard-section-head">
            <h2>Payment overview</h2>
            <p>{formatRangeLabel(data.date_range?.from, data.date_range?.to)}</p>
          </div>
          <div className="dashboard-payments-grid">
            {paymentCards.map((card) => (
              <article
                key={card.key}
                className={`dashboard-payment-card ${card.accent ? "is-accent" : ""} ${card.warn ? "is-warn" : ""}`}
              >
                <span className="dashboard-payment-label">{card.label}</span>
                <span className="dashboard-payment-value">{card.value}</span>
                <span className="dashboard-payment-hint">{card.hint}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {showCompaniesPaymentGrid && (
        <section className="dashboard-payments-section">
          <div className="dashboard-section-head">
            <h2>Payments by clinic</h2>
            <p>Per-company summary for the selected date range</p>
          </div>
          <div className="dashboard-companies-payment-grid">
            {data.companies_payment.map((row) => (
              <article key={row.id} className="dashboard-company-payment-card">
                <h3>{row.name}</h3>
                <dl className="dashboard-company-payment-stats">
                  <div>
                    <dt>Today</dt>
                    <dd>{formatMoney(row.today_revenue)}</dd>
                  </div>
                  <div>
                    <dt>Period</dt>
                    <dd>{formatMoney(row.period_revenue)}</dd>
                  </div>
                  <div>
                    <dt>Outstanding</dt>
                    <dd>{formatMoney(row.outstanding_due)}</dd>
                  </div>
                  <div>
                    <dt>Collection</dt>
                    <dd>{formatPercent(row.collection_rate)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {doctorPerformance.length > 0 && (
        <section className="dashboard-payments-section dashboard-doctor-performance">
          <div className="dashboard-section-head dashboard-section-head--row">
            <div>
              <h2>Doctor performance</h2>
              <p>
                {hasMoreDoctors
                  ? `Top ${DOCTOR_PERFORMANCE_PREVIEW} by revenue · ${doctorRangeLabel}`
                  : `Patients seen and revenue collected · ${doctorRangeLabel}`}
              </p>
            </div>
            {hasMoreDoctors && (
              <button
                type="button"
                className="crud-btn crud-btn--ghost dashboard-doctor-view-all"
                onClick={() => setDoctorPerformanceOpen(true)}
              >
                View all
                <span className="dashboard-doctor-view-all-count">{doctorPerformance.length}</span>
              </button>
            )}
          </div>
          <DoctorPerformanceTable
            rows={doctorPerformancePreview}
            showCompanyCol={showDoctorCompanyCol}
          />
          {hasMoreDoctors && (
            <p className="dashboard-doctor-preview-foot">
              Showing top {DOCTOR_PERFORMANCE_PREVIEW} of {doctorPerformance.length} doctors.{" "}
              <button
                type="button"
                className="dashboard-doctor-preview-link"
                onClick={() => setDoctorPerformanceOpen(true)}
              >
                View full ranking
              </button>
            </p>
          )}
          <Modal
            title="Doctor performance"
            open={doctorPerformanceOpen}
            onClose={() => setDoctorPerformanceOpen(false)}
          >
            <div className="dashboard-doctor-modal">
              <p className="dashboard-doctor-modal-meta">{doctorRangeLabel}</p>
              <DoctorPerformanceTable
                rows={doctorPerformance}
                showCompanyCol={showDoctorCompanyCol}
              />
              <div className="crud-modal-actions">
                <button
                  type="button"
                  className="crud-btn crud-btn--primary"
                  onClick={() => setDoctorPerformanceOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        </section>
      )}

      <div className="dashboard-stats">
        {!isDoctor && summary.companies != null && (
          <div className="dashboard-stat-card stat-accent">
            <div className="stat-label">Active clinics</div>
            <div className="stat-value">{summary.companies}</div>
          </div>
        )}
        <div className="dashboard-stat-card">
          <div className="stat-label">Patients</div>
          <div className="stat-value">{summary.patients}</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="stat-label">{isDoctor ? "You" : "Doctors"}</div>
          <div className="stat-value">{summary.doctors}</div>
        </div>
        <div className="dashboard-stat-card stat-accent">
          <div className="stat-label">Appointments in range</div>
          <div className="stat-value">{summary.appointments_total}</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="stat-label">Today&apos;s appointments</div>
          <div className="stat-value">{summary.appointments_today}</div>
        </div>
        {!isDoctor && (
          <>
            <div className="dashboard-stat-card">
              <div className="stat-label">Departments</div>
              <div className="stat-value">{summary.departments}</div>
            </div>
            {/* <div className="dashboard-stat-card">
              <div className="stat-label">Collected (range)</div>
              <div className="stat-value stat-value--money">
                {formatMoney(summary.billing_collected)}
              </div>
            </div>
            <div className="dashboard-stat-card">
              <div className="stat-label">Pending (range)</div>
              <div className="stat-value stat-value--money">
                {formatMoney(summary.billing_pending)}
              </div>
            </div> */}
          </>
        )}
      </div>

      <div className="dashboard-charts">
        {showCompaniesOverview && (
          <div className="dashboard-chart-card dashboard-chart-card--wide">
            <h3>Clinics overview</h3>
            <p className="chart-subtitle">Activity in selected date range</p>
            <div className="dashboard-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.companies_overview} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="appointments" name="Appointments" fill={CHART_AMBER} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="period_revenue" name="Revenue" fill={CHART_TEAL} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="dashboard-chart-card">
          <h3>Appointments by status</h3>
          <p className="chart-subtitle">In selected date range</p>
          <div className="dashboard-chart-body">
            {statusData.length === 0 ? (
              <p className="crud-empty" style={{ paddingTop: 80 }}>
                No appointments in this range.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dashboard-chart-card">
          <h3>Appointments trend</h3>
          <p className="chart-subtitle">By month in range</p>
          <div className="dashboard-chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointments_by_month}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Appointments" fill={CHART_TEAL} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {showBillingChart && (
          <div className="dashboard-chart-card dashboard-chart-card--wide">
            <h3>Billing trend</h3>
            <p className="chart-subtitle">Collected vs outstanding in range</p>
            <div className="dashboard-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billing_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Legend />
                  <Bar dataKey="collected" name="Collected" fill={CHART_TEAL} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Outstanding" fill={CHART_AMBER} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <section className="dashboard-recent">
        <h3>Recent appointments</h3>
        <p className="chart-subtitle" style={{ marginTop: -8, marginBottom: 14 }}>
          Latest in selected date range
        </p>
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                {isSuperAdmin && !filterCompanyId && <th>Clinic</th>}
                <th>Date</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_appointments.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin && !filterCompanyId ? 5 : 4} className="crud-empty">
                    No appointments in this range.
                  </td>
                </tr>
              )}
              {data.recent_appointments.map((row) => (
                <tr key={row.id}>
                  {isSuperAdmin && !filterCompanyId && (
                    <td>
                      <span className="tenant-company-badge">{row.company_name || "—"}</span>
                    </td>
                  )}
                  <td>{formatDateTime(row.appointment_date)}</td>
                  <td>{row.patient_name || "—"}</td>
                  <td>{row.doctor_name || "—"}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {loading && data && (
        <div className="dashboard-refreshing" aria-live="polite">
          Updating…
        </div>
      )}
    </div>
  );
}

export default Dashboard;
