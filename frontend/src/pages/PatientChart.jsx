import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { openPrescription } from "../api/appointments";
import { getPatientHistory } from "../api/patients";
import { getApiErrorMessage } from "../utils/apiError";
import "./PatientChart.css";

const TABS = [
  { id: "overview", label: "Overview", icon: "📋" },
  { id: "appointments", label: "Appointments", icon: "📅" },
  { id: "prescriptions", label: "Prescriptions", icon: "💊" },
  { id: "labs", label: "Lab Reports", icon: "🧪" },
  { id: "diagnostics", label: "Diagnostics", icon: "🩻" },
  { id: "profile", label: "Patient Profile", icon: "👤" },
];

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
        {item.prescription ? (
          <div className="patient-chart-prescription-snippet">
            <strong>Prescription</strong>
            <pre>{item.prescription}</pre>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [data, setData] = useState(null);
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
          <div className="patient-chart-quick-stats">
            <div><strong>{summary.appointments}</strong><span>Visits</span></div>
            <div><strong>{summary.prescriptions}</strong><span>Rx</span></div>
            <div><strong>{summary.lab_orders}</strong><span>Lab</span></div>
            <div><strong>{summary.diagnostic_orders}</strong><span>Scans</span></div>
          </div>
          {summary.last_visit ? (
            <p className="patient-chart-last-visit">Last visit: {formatDateShort(summary.last_visit)}</p>
          ) : null}
        </div>

        <nav className="patient-chart-nav" aria-label="Patient sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "active" : undefined}
              onClick={() => setTab(t.id)}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="patient-chart-main">
        {tab === "overview" && (
          <section className="patient-chart-section">
            <header className="patient-chart-section-header">
              <h1>Medical timeline</h1>
              <p>All visits, prescriptions, lab and diagnostic reports — newest first.</p>
            </header>
            {timeline.length === 0 ? (
              <p className="patient-chart-empty">No records yet for this patient.</p>
            ) : (
              <div className="patient-chart-timeline">
                {timeline.map((item) => (
                  <TimelineCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "appointments" && (
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

        {tab === "prescriptions" && (
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
                    <pre className="patient-chart-prescription-text">{item.prescription}</pre>
                    <button type="button" className="patient-chart-link-btn" onClick={() => openPrescription(item.id)}>
                      Download / print prescription
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "labs" && (
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

        {tab === "diagnostics" && (
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

        {tab === "profile" && (
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
