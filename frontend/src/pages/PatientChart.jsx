import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { openPrescription } from "../api/appointments";
import { getPatientHistory, getPatientWallet } from "../api/patients";
import { useAuth } from "../auth/AuthContext";
import { modulesFromLegacyType, normalizeModules } from "../config/companyModules";
import { hasPermission } from "../config/permissions";
import AuditTimeline from "../components/audit/AuditTimeline";
import { getApiErrorMessage } from "../utils/apiError";
import "./PatientChart.css";

const WALLET_TYPE_LABELS = {
  refund_credit: "Refund credit",
  payment_debit: "Payment from wallet",
  manual_credit: "Manual credit",
  manual_debit: "Manual debit",
};

const ALL_TABS = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "appointments", label: "Appointments", icon: "📅", module: "clinic" },
  { id: "prescriptions", label: "Prescriptions", icon: "💊", module: "clinic" },
  { id: "labs", label: "Lab Reports", icon: "🧪", module: "laboratory" },
  { id: "diagnostics", label: "Diagnostics", icon: "🩻", module: "diagnostics" },
  { id: "wallet", label: "Wallet", icon: "💳" },
  { id: "activity", label: "Activity Log", icon: "📜", auditOnly: true },
  { id: "profile", label: "Patient Profile", icon: "👤" },
];

function resolveCompanyModules(patientCompany, userCompany) {
  const raw = patientCompany?.modules?.length
    ? patientCompany.modules
    : userCompany?.modules;
  if (raw?.length) return normalizeModules(raw);
  const legacyType = patientCompany?.type || userCompany?.type;
  return normalizeModules(modulesFromLegacyType(legacyType));
}

function getVisibleTabs(modules, permissions = []) {
  const enabled = new Set(modules);
  return ALL_TABS.filter((t) => {
    if (t.auditOnly && !hasPermission(permissions, "audit.view")) return false;
    return !t.module || enabled.has(t.module);
  });
}

function getVisibleQuickStats(modules, summary) {
  const enabled = new Set(modules);
  const stats = [];
  if (enabled.has("clinic")) {
    stats.push({ key: "visits", value: summary.appointments, label: "Visits" });
    stats.push({ key: "rx", value: summary.prescriptions, label: "Rx" });
  }
  if (enabled.has("laboratory")) {
    stats.push({ key: "lab", value: summary.lab_orders, label: "Lab" });
  }
  if (enabled.has("diagnostics")) {
    stats.push({ key: "scans", value: summary.diagnostic_orders, label: "Scans" });
  }
  return stats;
}

function filterTimelineByModules(timeline, modules) {
  const enabled = new Set(modules);
  return timeline.filter((item) => {
    if (item.type === "appointment") return enabled.has("clinic");
    if (item.type === "lab_order") return enabled.has("laboratory");
    if (item.type === "diagnostic_order") return enabled.has("diagnostics");
    return true;
  });
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }) {
  return <span className={`patient-chart-badge patient-chart-badge--${status}`}>{status}</span>;
}

function VitalsGrid({ vitals }) {
  if (!vitals) return null;
  const rows = [
    ["Blood pressure", vitals.blood_pressure],
    ["Heart rate", vitals.heart_rate ? `${vitals.heart_rate} bpm` : null],
    ["Temperature", vitals.body_temperature ? `${vitals.body_temperature} °C` : null],
    ["SpO₂", vitals.oxygen_saturation ? `${vitals.oxygen_saturation}%` : null],
    ["Resp. rate", vitals.respiratory_rate ? `${vitals.respiratory_rate}/min` : null],
    ["Blood sugar", vitals.blood_sugar ? `${vitals.blood_sugar} mg/dL` : null],
  ].filter(([, v]) => v);

  if (!rows.length) return null;

  return (
    <div className="patient-chart-vitals">
      {rows.map(([label, value]) => (
        <div key={label} className="patient-chart-vital">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function TimelineCard({ item }) {
  if (item.type === "appointment") {
    return (
      <article className="patient-chart-timeline-card">
        <div className="patient-chart-timeline-head">
          <span className="patient-chart-timeline-type">Appointment</span>
          <time>{formatDate(item.date)}</time>
        </div>
        <h3>{item.doctor_name || "Doctor"}</h3>
        {item.department ? <p className="patient-chart-meta">{item.department}</p> : null}
        <StatusBadge status={item.status} />
        {item.reason ? <p><strong>Reason:</strong> {item.reason}</p> : null}
        {item.notes ? <p><strong>Notes:</strong> {item.notes}</p> : null}
        {item.prescription || item.prescription_file_url ? (
          <div className="patient-chart-prescription-snippet">
            <strong>Prescription</strong>
            {item.prescription_type === "upload" && item.prescription_file_url ? (
              <p>
                <a href={item.prescription_file_url} target="_blank" rel="noreferrer">
                  View uploaded prescription
                </a>
              </p>
            ) : (
              <pre>{item.prescription}</pre>
            )}
            <button type="button" className="patient-chart-link-btn" onClick={() => openPrescription(item.id)}>
              Open prescription PDF
            </button>
          </div>
        ) : null}
        <VitalsGrid vitals={item.vitals} />
      </article>
    );
  }

  if (item.type === "lab_order") {
    return (
      <article className="patient-chart-timeline-card">
        <div className="patient-chart-timeline-head">
          <span className="patient-chart-timeline-type lab">Lab</span>
          <time>{formatDate(item.date)}</time>
        </div>
        <h3>{item.order_number}</h3>
        <StatusBadge status={item.status} />
        {item.tests?.length > 0 ? (
          <ul className="patient-chart-test-list">
            {item.tests.map((t, i) => (
              <li key={i}>
                <span>{t.name}</span>
                {t.result ? (
                  <span className={t.result.flag ? `flag-${t.result.flag}` : ""}>
                    {t.result.value} {t.result.unit}
                    {t.result.ref_range ? ` (ref: ${t.result.ref_range})` : ""}
                  </span>
                ) : (
                  <span className="patient-chart-muted">Pending</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    );
  }

  return (
    <article className="patient-chart-timeline-card">
      <div className="patient-chart-timeline-head">
        <span className="patient-chart-timeline-type diagnostic">Diagnostic</span>
        <time>{formatDate(item.date)}</time>
      </div>
      <h3>{item.test_name || item.order_number}</h3>
      {item.modality ? <p className="patient-chart-meta">{item.modality}</p> : null}
      <StatusBadge status={item.status} />
      {item.report ? (
        <div className="patient-chart-report">
          {item.report.findings ? <p><strong>Findings:</strong> {item.report.findings}</p> : null}
          {item.report.impression ? <p><strong>Impression:</strong> {item.report.impression}</p> : null}
          {item.report.recommendations ? <p><strong>Recommendations:</strong> {item.report.recommendations}</p> : null}
        </div>
      ) : (
        <p className="patient-chart-muted">Report pending</p>
      )}
    </article>
  );
}

function PatientChart() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [data, setData] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setTab = (id) => {
    setSearchParams({ tab: id });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: history } = await getPatientHistory(patientId);
      setData(history);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load patient chart."));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const companyModules = useMemo(
    () => (data ? resolveCompanyModules(data.patient?.company, user?.company) : []),
    [data, user?.company]
  );

  const visibleTabs = useMemo(
    () => getVisibleTabs(companyModules, user?.permissions),
    [companyModules, user?.permissions]
  );

  useEffect(() => {
    if (!data || visibleTabs.some((t) => t.id === tab)) return;
    setSearchParams({ tab: "overview" }, { replace: true });
  }, [tab, visibleTabs, data, setSearchParams]);

  useEffect(() => {
    if (tab !== "wallet" || !patientId) return;
    let cancelled = false;
    setWalletLoading(true);
    getPatientWallet(patientId)
      .then(({ data: wallet }) => {
        if (!cancelled) setWalletData(wallet);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load wallet."));
      })
      .finally(() => {
        if (!cancelled) setWalletLoading(false);
      });
    return () => { cancelled = true; };
  }, [tab, patientId]);

  if (loading) {
    return <div className="patient-chart-loading">Loading patient chart…</div>;
  }

  if (error || !data) {
    return (
      <div className="patient-chart-error">
        <p>{error || "Patient not found."}</p>
        <Link to="/patients" className="patient-chart-back">← Back to patients</Link>
      </div>
    );
  }

  const { patient, summary, timeline, appointments, prescriptions, lab_orders, diagnostic_orders } = data;
  const quickStats = getVisibleQuickStats(companyModules, summary);
  const filteredTimeline = filterTimelineByModules(timeline, companyModules);
  const activeTab = visibleTabs.some((t) => t.id === tab) ? tab : "overview";

  return (
    <div className="patient-chart">
      <aside className="patient-chart-sidebar">
        <Link to="/patients" className="patient-chart-back">← All patients</Link>

        <div className="patient-chart-patient-card">
          <div className="patient-chart-avatar" aria-hidden="true">
            {patient.name?.charAt(0)?.toUpperCase() || "P"}
          </div>
          <h2>{patient.name}</h2>
          <p className="patient-chart-code">{patient.patient_code}</p>
          {patient.company?.name ? <p className="patient-chart-clinic">{patient.company.name}</p> : null}
          {quickStats.length > 0 ? (
            <div className="patient-chart-quick-stats">
              {quickStats.map((stat) => (
                <div key={stat.key}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          ) : null}
          {summary.last_visit ? (
            <p className="patient-chart-last-visit">Last visit: {formatDateShort(summary.last_visit)}</p>
          ) : null}
        </div>

        <nav className="patient-chart-nav" aria-label="Patient sections">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={activeTab === t.id ? "active" : undefined}
              onClick={() => setTab(t.id)}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="patient-chart-main">
        {activeTab === "overview" && (
          <section className="patient-chart-section">
            <header className="patient-chart-section-header">
              <h1>Medical timeline</h1>
              <p>All visits, prescriptions, lab and diagnostic reports — newest first.</p>
            </header>
            {filteredTimeline.length === 0 ? (
              <p className="patient-chart-empty">No records yet for this patient.</p>
            ) : (
              <div className="patient-chart-timeline">
                {filteredTimeline.map((item) => (
                  <TimelineCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "appointments" && (
          <section className="patient-chart-section">
            <header className="patient-chart-section-header">
              <h1>Appointments</h1>
              <p>{appointments.length} visit(s) on record.</p>
            </header>
            {appointments.length === 0 ? (
              <p className="patient-chart-empty">No appointments yet.</p>
            ) : (
              <div className="patient-chart-list">
                {appointments.map((item) => (
                  <article key={item.id} className="patient-chart-record-card">
                    <div className="patient-chart-record-head">
                      <time>{formatDate(item.date)}</time>
                      <StatusBadge status={item.status} />
                    </div>
                    <h3>{item.doctor_name}</h3>
                    {item.department ? <p className="patient-chart-meta">{item.department}</p> : null}
                    {item.reason ? <p><strong>Reason:</strong> {item.reason}</p> : null}
                    {item.notes ? <p><strong>Notes:</strong> {item.notes}</p> : null}
                    <VitalsGrid vitals={item.vitals} />
                    {item.billing ? (
                      <p className="patient-chart-billing">
                        Billed ₹{item.billing.total_amount} · Paid ₹{item.billing.paid_amount}
                        {item.billing.due_amount > 0 ? ` · Due ₹${item.billing.due_amount}` : ""}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "prescriptions" && (
          <section className="patient-chart-section">
            <header className="patient-chart-section-header">
              <h1>Prescriptions</h1>
              <p>Previous prescriptions from completed visits.</p>
            </header>
            {prescriptions.length === 0 ? (
              <p className="patient-chart-empty">No prescriptions on file.</p>
            ) : (
              <div className="patient-chart-list">
                {prescriptions.map((item) => (
                  <article key={item.id} className="patient-chart-record-card">
                    <div className="patient-chart-record-head">
                      <time>{formatDate(item.date)}</time>
                      <span className="patient-chart-meta">{item.doctor_name}</span>
                    </div>
                    {item.prescription_type === "upload" && item.prescription_file_url ? (
                      <p>
                        <a href={item.prescription_file_url} target="_blank" rel="noreferrer">
                          View uploaded prescription
                        </a>
                      </p>
                    ) : item.prescription ? (
                      <pre className="patient-chart-prescription-text">{item.prescription}</pre>
                    ) : null}
                    <button type="button" className="patient-chart-link-btn" onClick={() => openPrescription(item.id)}>
                      Download / print prescription
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "labs" && (
          <section className="patient-chart-section">
            <header className="patient-chart-section-header">
              <h1>Lab reports</h1>
              <p>{lab_orders.length} lab order(s).</p>
            </header>
            {lab_orders.length === 0 ? (
              <p className="patient-chart-empty">No lab orders yet.</p>
            ) : (
              <div className="patient-chart-list">
                {lab_orders.map((item) => (
                  <article key={item.id} className="patient-chart-record-card">
                    <div className="patient-chart-record-head">
                      <time>{formatDate(item.date)}</time>
                      <StatusBadge status={item.status} />
                    </div>
                    <h3>{item.order_number}</h3>
                    {item.doctor_name ? <p className="patient-chart-meta">Ordered by {item.doctor_name}</p> : null}
                    <ul className="patient-chart-test-list">
                      {item.tests.map((t, i) => (
                        <li key={i}>
                          <span>{t.name}</span>
                          {t.result ? (
                            <span>{t.result.value} {t.result.unit} {t.result.ref_range ? `(ref: ${t.result.ref_range})` : ""}</span>
                          ) : (
                            <span className="patient-chart-muted">Pending</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "diagnostics" && (
          <section className="patient-chart-section">
            <header className="patient-chart-section-header">
              <h1>Diagnostic reports</h1>
              <p>{diagnostic_orders.length} imaging / diagnostic order(s).</p>
            </header>
            {diagnostic_orders.length === 0 ? (
              <p className="patient-chart-empty">No diagnostic orders yet.</p>
            ) : (
              <div className="patient-chart-list">
                {diagnostic_orders.map((item) => (
                  <article key={item.id} className="patient-chart-record-card">
                    <div className="patient-chart-record-head">
                      <time>{formatDate(item.date)}</time>
                      <StatusBadge status={item.status} />
                    </div>
                    <h3>{item.test_name}</h3>
                    <p className="patient-chart-meta">{item.order_number} · {item.modality}</p>
                    {item.report ? (
                      <div className="patient-chart-report">
                        {item.report.findings ? <p><strong>Findings:</strong> {item.report.findings}</p> : null}
                        {item.report.impression ? <p><strong>Impression:</strong> {item.report.impression}</p> : null}
                        {item.report.recommendations ? <p><strong>Recommendations:</strong> {item.report.recommendations}</p> : null}
                      </div>
                    ) : (
                      <p className="patient-chart-muted">Report not uploaded yet.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "wallet" && (
          <section className="patient-chart-section">
            <header className="patient-chart-section-header">
              <h1>Patient wallet</h1>
              <p>Balance and transaction history for refunds and wallet payments.</p>
            </header>
            {walletLoading ? (
              <p className="patient-chart-empty">Loading wallet…</p>
            ) : (
              <>
                <div className="patient-chart-wallet-balance">
                  <span>Available balance</span>
                  <strong>₹{Number(walletData?.balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                </div>
                {!walletData?.transactions?.length ? (
                  <p className="patient-chart-empty">No wallet transactions yet.</p>
                ) : (
                  <div className="patient-chart-table-wrap">
                    <table className="patient-chart-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Balance after</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th>Notes</th>
                          <th>By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletData.transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td>{formatDate(tx.transacted_at)}</td>
                            <td>{WALLET_TYPE_LABELS[tx.type] || tx.type}</td>
                            <td>₹{Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            <td>₹{Number(tx.balance_after).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                            <td>{tx.method || "—"}</td>
                            <td>{tx.reference || "—"}</td>
                            <td>{tx.notes || "—"}</td>
                            <td>{tx.recorded_by || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "activity" && (
          <section className="patient-chart-section">
            <header className="patient-chart-section-header">
              <h1>Activity log</h1>
              <p>All changes and actions related to this patient and their orders.</p>
            </header>
            <AuditTimeline patientId={Number(patientId)} />
          </section>
        )}

        {activeTab === "profile" && (
          <section className="patient-chart-section">
            <header className="patient-chart-section-header">
              <h1>Patient profile</h1>
              <p>Demographics and medical background.</p>
            </header>
            <dl className="patient-chart-profile-grid">
              <div><dt>Email</dt><dd>{patient.email}</dd></div>
              <div><dt>Phone</dt><dd>{patient.phone || "—"}</dd></div>
              <div><dt>Gender</dt><dd>{patient.gender || "—"}</dd></div>
              <div><dt>Date of birth</dt><dd>{patient.date_of_birth?.slice(0, 10) || "—"}</dd></div>
              <div><dt>Blood group</dt><dd>{patient.blood_group || "—"}</dd></div>
              <div><dt>Height</dt><dd>{patient.height != null ? `${patient.height} cm` : "—"}</dd></div>
              <div><dt>Weight</dt><dd>{patient.weight != null ? `${patient.weight} kg` : "—"}</dd></div>
              <div><dt>Address</dt><dd>{patient.address || "—"}</dd></div>
              <div><dt>Emergency contact</dt>
                <dd>
                  {patient.emergency_contact_name
                    ? `${patient.emergency_contact_name}${patient.emergency_contact_phone ? ` · ${patient.emergency_contact_phone}` : ""}`
                    : "—"}
                </dd>
              </div>
              <div className="full"><dt>Allergies</dt><dd>{patient.allergies || "None recorded"}</dd></div>
              <div className="full"><dt>Medical history</dt><dd>{patient.medical_history || "None recorded"}</dd></div>
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}

export default PatientChart;
