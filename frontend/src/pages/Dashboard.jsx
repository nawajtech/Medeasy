import { useCallback, useEffect, useState } from "react";
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

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Dashboard() {
  const { isSuperAdmin, isDoctor } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
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
  }, [isSuperAdmin, filterCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard…</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  if (!data) return null;

  const { summary, appointments_by_status, appointments_by_month, billing_by_month } = data;
  const statusData = appointments_by_status.map((row) => ({
    name: row.status.charAt(0).toUpperCase() + row.status.slice(1),
    value: row.count,
    status: row.status,
  }));

  const showBilling = !isDoctor && billing_by_month.length > 0;
  const showCompaniesOverview = data.companies_overview?.length > 0;

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            {isDoctor
              ? "Your appointments and assigned patients at a glance."
              : "Clinic analytics scoped to your organization."}
          </p>
          <span className="dashboard-scope-badge">
            Viewing: <strong>{data.scope_label}</strong>
          </span>
        </div>
        {isSuperAdmin && (
          <CompanySelect
            variant="inline"
            allowAll
            label="Clinic scope"
            id="dashboard_company_id"
            value={filterCompanyId}
            onChange={(e) => setFilterCompanyId(e.target.value)}
            required={false}
          />
        )}
      </header>

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
          <div className="stat-label">Today&apos;s appointments</div>
          <div className="stat-value">{summary.appointments_today}</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="stat-label">Total appointments</div>
          <div className="stat-value">{summary.appointments_total}</div>
        </div>
        {!isDoctor && (
          <>
            <div className="dashboard-stat-card">
              <div className="stat-label">Departments</div>
              <div className="stat-value">{summary.departments}</div>
            </div>
            <div className="dashboard-stat-card">
              <div className="stat-label">Collected</div>
              <div className="stat-value stat-value--money">
                {formatMoney(summary.billing_collected)}
              </div>
            </div>
            <div className="dashboard-stat-card">
              <div className="stat-label">Pending due</div>
              <div className="stat-value stat-value--money">
                {formatMoney(summary.billing_pending)}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="dashboard-charts">
        {showCompaniesOverview && (
          <div className="dashboard-chart-card dashboard-chart-card--wide">
            <h3>Clinics overview</h3>
            <p className="chart-subtitle">Patients, doctors, and appointments per company</p>
            <div className="dashboard-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.companies_overview}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="patients" name="Patients" fill={CHART_TEAL} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="doctors" name="Doctors" fill={CHART_BLUE} radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="appointments"
                    name="Appointments"
                    fill={CHART_AMBER}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="dashboard-chart-card">
          <h3>Appointments by status</h3>
          <p className="chart-subtitle">Current distribution in selected scope</p>
          <div className="dashboard-chart-body">
            {statusData.length === 0 ? (
              <p className="crud-empty" style={{ paddingTop: 80 }}>
                No appointment data yet.
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
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] || "#94a3b8"}
                      />
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
          <p className="chart-subtitle">Last 6 months</p>
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

        {showBilling && (
          <div className="dashboard-chart-card dashboard-chart-card--wide">
            <h3>Billing trend</h3>
            <p className="chart-subtitle">Collected vs pending due — last 6 months</p>
            <div className="dashboard-chart-body">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={billing_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Legend />
                  <Bar dataKey="collected" name="Collected" fill={CHART_TEAL} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill={CHART_AMBER} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <section className="dashboard-recent">
        <h3>Recent appointments</h3>
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
                  <td
                    colSpan={isSuperAdmin && !filterCompanyId ? 5 : 4}
                    className="crud-empty"
                  >
                    No appointments yet.
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
    </div>
  );
}

export default Dashboard;
