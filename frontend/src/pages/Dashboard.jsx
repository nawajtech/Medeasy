import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
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
import { currencySymbol, formatCurrency } from "../config/currency";
import { PERMISSIONS, isDiagnosticsOnlyDoctor } from "../config/permissions";
import { usePermissions } from "../hooks/usePermissions";
import CompanySelect from "../components/CompanySelect";
import Modal from "../components/crud/Modal";
import "../components/crud/crud.css";
import {
  IconBuilding,
  IconCalendar,
  IconCalendarDays,
  IconChart,
  IconDashboard,
  IconDollar,
  IconPatient,
  IconStethoscope,
  IconTrendDown,
  IconTrendUp,
} from "../components/icons";
import { getApiErrorMessage } from "../utils/apiError";
import { SubscriptionSummaryCard } from "./Subscription";
import "./Dashboard.css";

const STATUS_COLORS = {
  booked: "#0f766e",
  ongoing: "#2563eb",
  completed: "#16a34a",
  cancelled: "#dc2626",
  scheduled: "#0f766e",
  confirmed: "#2563eb",
};

const CHART_TEAL = "#0f766e";
const CHART_TEAL_LIGHT = "#14b8a6";
const CHART_BLUE = "#3b82f6";
const CHART_AMBER = "#f59e0b";
const DOCTOR_PERFORMANCE_PREVIEW = 5;

const PRESET_DAYS = [7, 30, 90];

function getActivePresetDays(from, to) {
  const today = formatLocalDate(new Date());
  if (to !== today) return null;
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const diff = Math.round((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
  return PRESET_DAYS.includes(diff) ? diff : null;
}

function ChartTooltipContent({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="dashboard-chart-tooltip">
      {label ? <p className="dashboard-chart-tooltip-label">{label}</p> : null}
      {payload.map((entry) => (
        <div className="dashboard-chart-tooltip-row" key={entry.name ?? entry.dataKey}>
          <span
            className="dashboard-chart-tooltip-dot"
            style={{ background: entry.color || entry.fill }}
          />
          <span>{entry.name}</span>
          <span className="dashboard-chart-tooltip-value">
            {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

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
  return formatCurrency(value);
}

function formatRupee(value) {
  return formatCurrency(value);
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatGrowthPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const num = Number(value);
  const prefix = num > 0 ? "+" : "";
  return `${prefix}${num.toFixed(1)}%`;
}

function GrowthBadge({ value, invert = false }) {
  const formatted = formatGrowthPercent(value);
  if (!formatted) return null;

  const num = Number(value);
  const isUp = invert ? num < 0 : num > 0;
  const isDown = invert ? num > 0 : num < 0;
  const tone = isUp ? "is-up" : isDown ? "is-down" : "is-flat";

  return (
    <span className={`dashboard-growth-badge ${tone}`}>
      {isUp ? <IconTrendUp size={12} /> : null}
      {isDown ? <IconTrendDown size={12} /> : null}
      {formatted}
    </span>
  );
}

function CollectionSourceRow({ label, stats, showMoney }) {
  if (!stats) return null;

  return (
    <div className="dashboard-collection-source">
      <div className="dashboard-collection-source-head">
        <span className="dashboard-collection-source-label">{label}</span>
        <span className="dashboard-collection-source-counts">
          {stats.completed_count} completed · {stats.pending_count} pending
        </span>
      </div>
      {showMoney && (
        <dl className="dashboard-collection-source-stats">
          <div>
            <dt>Collected</dt>
            <dd>{formatMoney(stats.collected)}</dd>
          </div>
          <div>
            <dt>Outstanding</dt>
            <dd className={stats.outstanding > 0 ? "is-warn" : ""}>{formatMoney(stats.outstanding)}</dd>
          </div>
          <div>
            <dt>Collection rate</dt>
            <dd>{formatPercent(stats.collection_rate)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
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
  const { user, isSuperAdmin, isDoctor, isCompanyAdmin, isStaff } = useAuth();
  const { can } = usePermissions();
  const showAdminPayments = !isDoctor && (isSuperAdmin || isCompanyAdmin || isStaff) && can(PERMISSIONS.BILLING_VIEW);

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

  const { summary, appointments_by_status, appointments_by_month, billing_by_month, payment_overview, patient_collections } =
    data;
  const statusData = appointments_by_status.map((row) => ({
    name: row.status.charAt(0).toUpperCase() + row.status.slice(1),
    value: row.count,
    status: row.status,
  }));

  const showBillingChart = can(PERMISSIONS.BILLING_VIEW) && !isDoctor && billing_by_month.length > 0;
  const showCompaniesOverview = can(PERMISSIONS.COMPANY_VIEW) && data.companies_overview?.length > 0;
  const showCompaniesPaymentGrid =
    can(PERMISSIONS.BILLING_VIEW) && isSuperAdmin && !filterCompanyId && data.companies_payment?.length > 0;

  const doctorPerformance = data.doctor_performance ?? [];
  const showDoctorCompanyCol = doctorPerformance.some((row) => row.company_name);
  const doctorPerformancePreview = doctorPerformance.slice(0, DOCTOR_PERFORMANCE_PREVIEW);
  const hasMoreDoctors = doctorPerformance.length > DOCTOR_PERFORMANCE_PREVIEW;
  const doctorRangeLabel = formatRangeLabel(data.date_range?.from, data.date_range?.to);
  const activePreset = getActivePresetDays(dateFrom, dateTo);

  const quickStats = [
    { label: "Patients", value: summary.patients },
    { label: "Appointments", value: summary.appointments_total },
    { label: "Today", value: summary.appointments_today },
    ...(summary.companies != null ? [{ label: "Clinics", value: summary.companies }] : []),
  ];

  const statCardConfig = [
    ...(!isDoctor && summary.companies != null && can(PERMISSIONS.COMPANY_VIEW)
      ? [{
          key: "companies",
          label: "Active clinics",
          value: summary.companies,
          hint: "In your network",
          accent: true,
          icon: IconBuilding,
        }]
      : []),
    ...(can(PERMISSIONS.PATIENT_VIEW)
      ? [{
          key: "patients",
          label: "Patients",
          value: summary.patients,
          hint: "Registered patients",
          icon: IconPatient,
        }]
      : []),
    ...(can(PERMISSIONS.DOCTOR_VIEW)
      ? [{
          key: "doctors",
          label: isDoctor ? "You" : "Doctors",
          value: summary.doctors,
          hint: isDoctor ? "Your profile" : "Active doctors",
          icon: IconStethoscope,
        }]
      : []),
    ...(can(PERMISSIONS.APPOINTMENT_VIEW)
      ? [{
          key: "appointments",
          label: "Appointments in range",
          value: summary.appointments_total,
          hint: doctorRangeLabel || "Selected period",
          accent: true,
          icon: IconCalendarDays,
        },
        {
          key: "today",
          label: "Today's appointments",
          value: summary.appointments_today,
          hint: "Scheduled for today",
          icon: IconCalendar,
        }]
      : []),
    ...(!isDoctor && can(PERMISSIONS.DEPARTMENT_VIEW)
      ? [{
          key: "departments",
          label: "Departments",
          value: summary.departments,
          hint: "Clinical departments",
          icon: IconChart,
        }]
      : []),
  ];

  const paymentCards = payment_overview && can(PERMISSIONS.BILLING_VIEW)
    ? [
        {
          key: "today",
          label: "Today's revenue",
          value: formatMoney(payment_overview.today_revenue),
          hint: "Payments received today",
          accent: true,
          hintClass: "is-success",
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
          hintClass: payment_overview.outstanding_due > 0 ? "is-warn" : "",
        },
        {
          key: "rate",
          label: "Collection rate",
          value: formatPercent(payment_overview.collection_rate),
          hint: `Of ${formatMoney(payment_overview.period_total_billed)} billed`,
          hintClass: payment_overview.collection_rate >= 80 ? "is-success" : "",
        },
      ]
    : [];

  const collections = patient_collections;
  const collectionTotals = collections?.totals;
  const collectionGrowth = collections?.growth;
  const showCollectionMoney = !isDoctor && can(PERMISSIONS.BILLING_VIEW);
  const showPatientCollections = Boolean(collections && collectionTotals);
  const appointmentCollectionsChart = data.appointment_collections_by_month ?? [];
  const showAppointmentCollectionsChart = appointmentCollectionsChart.some(
    (row) => row.completed_count > 0 || row.pending_count > 0 || row.collected > 0 || row.outstanding > 0,
  );

  const patientCollectionCards = showPatientCollections
    ? [
        {
          key: "completed",
          label: "Completed visits",
          value: collectionTotals.completed_count,
          hint: showCollectionMoney && collections?.appointments
            ? `${formatMoney(collections.appointments.completed_collected)} collected`
            : "Successfully finished in range",
          accent: true,
          growth: collectionGrowth?.completed_percent,
        },
        {
          key: "pending",
          label: "Pending visits",
          value: collectionTotals.pending_count,
          hint: "Booked or in progress",
          warn: collectionTotals.pending_count > 0,
          growth: collectionGrowth?.pending_percent,
          growthInvert: true,
        },
        ...(showCollectionMoney
          ? [
              {
                key: "collected",
                label: "Total collected",
                value: formatMoney(collectionTotals.collected),
                hint: `Of ${formatMoney(collectionTotals.total_billed)} billed`,
                hintClass: "is-success",
                growth: collectionGrowth?.collected_percent,
              },
              {
                key: "outstanding",
                label: "Outstanding",
                value: formatMoney(collectionTotals.outstanding),
                hint: collectionGrowth?.collection_rate_change != null
                  ? `Collection rate ${formatPercent(collectionTotals.collection_rate)} (${collectionGrowth.collection_rate_change >= 0 ? "+" : ""}${collectionGrowth.collection_rate_change.toFixed(1)} pts vs prior period)`
                  : `Collection rate ${formatPercent(collectionTotals.collection_rate)}`,
                warn: collectionTotals.outstanding > 0,
                hintClass: collectionTotals.outstanding > 0 ? "is-warn" : "",
                growth: collectionGrowth?.outstanding_percent,
                growthInvert: true,
              },
            ]
          : []),
      ]
    : [];

  if (isDiagnosticsOnlyDoctor(user?.role, user?.company?.modules)) {
    return <Navigate to="/diagnostics/today" replace />;
  }

  return (
    <div className="dashboard-page">
      <SubscriptionSummaryCard />
      <section className="dashboard-hero">
        <div className="dashboard-hero-main">
          <div className="dashboard-title-row">
            <span className="dashboard-title-icon" aria-hidden="true">
              <IconDashboard size={22} />
            </span>
            <h1>Dashboard</h1>
          </div>
          <p>
            {isSuperAdmin
              ? "Platform-wide analytics across all organisations."
              : isCompanyAdmin
                ? `Organisation overview for ${user?.company?.name || "your hospital"}.`
                : isDoctor
                  ? "Your appointments and assigned patients at a glance."
                  : "Clinic analytics and payment overview for your organization."}
          </p>
          <span className="dashboard-scope-badge">
            Viewing: <strong>{data.scope_label}</strong>
          </span>
          <div className="dashboard-quick-stats" aria-label="Quick statistics">
            {quickStats.map((item) => (
              <div className="dashboard-quick-stat" key={item.label}>
                <span className="dashboard-quick-stat-value">{item.value}</span>
                <span className="dashboard-quick-stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="dashboard-filter-toolbar" role="toolbar" aria-label="Dashboard filters">
        {isSuperAdmin && (
          <>
            <div className="dashboard-filter-group">
              <CompanySelect
                variant="inline"
                allowAll
                label="Clinic"
                id="dashboard_company_id"
                value={filterCompanyId}
                onChange={(e) => setFilterCompanyId(e.target.value)}
                required={false}
              />
            </div>
            <div className="dashboard-filter-divider" aria-hidden="true" />
          </>
        )}
        <div className="dashboard-filter-group">
          <span className="dashboard-filter-label">Date range</span>
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
        </div>
        <div className="dashboard-filter-divider" aria-hidden="true" />
        <div
          className="dashboard-segmented"
          role="group"
          aria-label="Quick date presets"
        >
          {PRESET_DAYS.map((days) => (
            <button
              key={days}
              type="button"
              className={`dashboard-segmented-btn${activePreset === days ? " is-active" : ""}`}
              onClick={() => setPresetDays(days)}
              aria-pressed={activePreset === days}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

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
                <div className="dashboard-payment-card-header">
                  <span className="dashboard-payment-label">{card.label}</span>
                  <span className="dashboard-payment-icon" aria-hidden="true">
                    <IconDollar size={18} />
                  </span>
                </div>
                <span className="dashboard-payment-value">{card.value}</span>
                <span className={`dashboard-payment-hint ${card.hintClass || ""}`}>
                  {card.hintClass === "is-success" ? (
                    <IconTrendUp size={12} />
                  ) : null}
                  {card.hint}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {showPatientCollections && patientCollectionCards.length > 0 && (
        <section className="dashboard-payments-section dashboard-collections-section">
          <div className="dashboard-section-head">
            <h2>Patient collections</h2>
            <p>
              Completed vs pending visits and amounts collected
              {collectionGrowth?.previous_period
                ? ` · compared to ${formatRangeLabel(collectionGrowth.previous_period.from, collectionGrowth.previous_period.to)}`
                : ""}
            </p>
          </div>
          <div className={`dashboard-payments-grid dashboard-collections-grid${showCollectionMoney ? "" : " dashboard-collections-grid--counts"}`}>
            {patientCollectionCards.map((card) => (
              <article
                key={card.key}
                className={`dashboard-payment-card ${card.accent ? "is-accent" : ""} ${card.warn ? "is-warn" : ""}`}
              >
                <div className="dashboard-payment-card-header">
                  <span className="dashboard-payment-label">{card.label}</span>
                  <span className="dashboard-payment-icon" aria-hidden="true">
                    {card.key === "completed" || card.key === "pending" ? (
                      <IconCalendarDays size={18} />
                    ) : (
                      <IconDollar size={18} />
                    )}
                  </span>
                </div>
                <span className="dashboard-payment-value">{card.value}</span>
                <span className={`dashboard-payment-hint ${card.hintClass || ""}`}>{card.hint}</span>
                {card.growth != null && (
                  <GrowthBadge value={card.growth} invert={card.growthInvert} />
                )}
              </article>
            ))}
          </div>

          {(collections?.diagnostics || collections?.lab) && (
            <div className="dashboard-collection-breakdown">
              <h3>By service</h3>
              <CollectionSourceRow
                label="Appointments"
                stats={collections.appointments}
                showMoney={showCollectionMoney}
              />
              <CollectionSourceRow
                label="Diagnostics"
                stats={collections.diagnostics}
                showMoney={showCollectionMoney}
              />
              <CollectionSourceRow
                label="Lab"
                stats={collections.lab}
                showMoney={showCollectionMoney}
              />
            </div>
          )}
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
        {statCardConfig.map((card) => {
          const StatIcon = card.icon;
          return (
            <article
              key={card.key}
              className={`dashboard-stat-card${card.accent ? " stat-accent" : ""}`}
            >
              <div className="dashboard-stat-card-header">
                <span className="stat-label">{card.label}</span>
                <span className="dashboard-stat-icon" aria-hidden="true">
                  <StatIcon size={18} />
                </span>
              </div>
              <div className="stat-value">{card.value}</div>
              <span className="stat-hint">{card.hint}</span>
            </article>
          );
        })}
      </div>

      <div className="dashboard-charts">
        {showCompaniesOverview && (
          <div className="dashboard-chart-card dashboard-chart-card--wide">
            <h3>Clinics overview</h3>
            <p className="chart-subtitle">Activity in selected date range</p>
            <div className="dashboard-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.companies_overview} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="tealBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_TEAL_LIGHT} />
                      <stop offset="100%" stopColor={CHART_TEAL} />
                    </linearGradient>
                    <linearGradient id="amberBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor={CHART_AMBER} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltipContent valueFormatter={(v, name) => (name === "Revenue" ? formatMoney(v) : v)} />} />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                  <Bar dataKey="appointments" name="Appointments" fill="url(#amberBarGrad)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="period_revenue" name="Revenue" fill="url(#tealBarGrad)" radius={[8, 8, 0, 0]} />
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
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
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
              <BarChart data={appointments_by_month} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="trendBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_TEAL_LIGHT} />
                    <stop offset="100%" stopColor={CHART_TEAL} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" name="Appointments" fill="url(#trendBarGrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {showAppointmentCollectionsChart && (
          <div className="dashboard-chart-card dashboard-chart-card--wide">
            <h3>Appointment collections</h3>
            <p className="chart-subtitle">Completed visits and amounts by month</p>
            <div className="dashboard-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentCollectionsChart} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="completedCountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                    <linearGradient id="pendingCountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#93c5fd" />
                      <stop offset="100%" stopColor={CHART_BLUE} />
                    </linearGradient>
                    <linearGradient id="apptCollectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_TEAL_LIGHT} />
                      <stop offset="100%" stopColor={CHART_TEAL} />
                    </linearGradient>
                    <linearGradient id="apptOutstandingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor={CHART_AMBER} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  {showCollectionMoney && (
                    <YAxis
                      yAxisId="money"
                      orientation="right"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      tickFormatter={(v) => `${currencySymbol()}${v}`}
                      axisLine={false}
                      tickLine={false}
                    />
                  )}
                  <Tooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(v, name) => {
                          if (["Collected", "Outstanding"].includes(name)) return formatMoney(v);
                          return v;
                        }}
                      />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                  <Bar yAxisId="count" dataKey="completed_count" name="Completed" fill="url(#completedCountGrad)" radius={[8, 8, 0, 0]} />
                  <Bar yAxisId="count" dataKey="pending_count" name="Pending" fill="url(#pendingCountGrad)" radius={[8, 8, 0, 0]} />
                  {showCollectionMoney && (
                    <>
                      <Bar yAxisId="money" dataKey="collected" name="Collected" fill="url(#apptCollectedGrad)" radius={[8, 8, 0, 0]} />
                      <Bar yAxisId="money" dataKey="outstanding" name="Outstanding" fill="url(#apptOutstandingGrad)" radius={[8, 8, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {showBillingChart && (
          <div className="dashboard-chart-card dashboard-chart-card--wide">
            <h3>Billing trend</h3>
            <p className="chart-subtitle">Collected vs outstanding in range</p>
            <div className="dashboard-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billing_by_month} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_TEAL_LIGHT} />
                      <stop offset="100%" stopColor={CHART_TEAL} />
                    </linearGradient>
                    <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor={CHART_AMBER} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${currencySymbol()}${v}`} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltipContent valueFormatter={(v) => formatMoney(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                  <Bar dataKey="collected" name="Collected" fill="url(#collectedGrad)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="pending" name="Outstanding" fill="url(#pendingGrad)" radius={[8, 8, 0, 0]} />
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
