import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  bookReferral,
  getCentre,
  getCentreServices,
  getCentreSlots,
  requestPartnership,
} from "../api/portal";
import {
  Alert,
  CardList,
  EmptyState,
  FormGrid,
  ListRow,
  LoadingBlock,
  PageHeader,
  Panel,
  StatusBadge,
} from "../components/ui";
import { money } from "../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function roundMoney(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

export default function CentreDetail() {
  const { centreId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const forceBook = location.pathname.endsWith("/book");

  const [centre, setCentre] = useState(null);
  const [branches, setBranches] = useState([]);
  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [packageId, setPackageId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);
  const [notes, setNotes] = useState("");
  const [patient, setPatient] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "",
    date_of_birth: "",
    address: "",
  });
  const [consent, setConsent] = useState(false);
  const [paymentOption, setPaymentOption] = useState("pay_on_visit");
  const [onlineMethod, setOnlineMethod] = useState("upi");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState(
    "We would like to refer patients for diagnostics."
  );

  const approved = centre?.partnership_status === "approved";

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const centreRes = await getCentre(centreId);
        if (!active) return;
        setCentre(centreRes.data.centre);
        setBranches(centreRes.data.branches ?? []);
        setReferralCode(centreRes.data.centre?.referral_code || "");

        if (centreRes.data.centre?.partnership_status === "approved") {
          const servicesRes = await getCentreServices(centreId);
          if (!active) return;
          setTests(servicesRes.data.tests ?? []);
          setPackages(servicesRes.data.packages ?? []);
          setReferralCode(
            servicesRes.data.referral_code || centreRes.data.centre?.referral_code || ""
          );
        } else {
          setTests(centreRes.data.tests ?? []);
          setPackages(centreRes.data.packages ?? []);
        }
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load centre."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [centreId]);

  useEffect(() => {
    if (!approved) return undefined;
    let active = true;
    (async () => {
      setSlot(null);
      try {
        const { data } = await getCentreSlots(centreId, { date });
        if (active) setSlots(data.slots ?? []);
      } catch {
        if (active) setSlots([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [centreId, date, approved]);

  const estimatedTotal = useMemo(() => {
    if (!approved) return null;
    if (packageId) {
      const pkg = packages.find((p) => String(p.id) === String(packageId));
      if (!pkg) return null;
      const ids = pkg.test_ids || [];
      const gross = ids.reduce((sum, id) => {
        const test = tests.find((t) => t.id === id);
        return sum + (Number(test?.price) || 0);
      }, 0);
      const offer = Number(pkg.offer_percentage || 0);
      return offer > 0 ? roundMoney(gross * (1 - offer / 100)) : gross;
    }
    return selectedTests.reduce((sum, id) => {
      const test = tests.find((t) => t.id === id);
      return sum + (Number(test?.price) || 0);
    }, 0);
  }, [approved, packageId, packages, selectedTests, tests]);

  const toggleTest = (id) => {
    setPackageId("");
    setSelectedTests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submitPartnershipRequest = async () => {
    setRequesting(true);
    setError("");
    try {
      await requestPartnership({
        company_id: Number(centreId),
        message: requestMessage.trim() || null,
      });
      setCentre((prev) => (prev ? { ...prev, partnership_status: "pending" } : prev));
      setShowRequestModal(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not submit partnership request."));
    } finally {
      setRequesting(false);
    }
  };

  const handleBook = async () => {
    setError("");
    if (!packageId && selectedTests.length === 0) {
      setError("Select at least one test or a package.");
      return;
    }
    if (!slot?.datetime) {
      setError("Select an available appointment slot.");
      return;
    }
    if (!patient.name.trim() || !patient.phone.trim()) {
      setError("Patient name and phone are required.");
      return;
    }
    if (!consent) {
      setError("Patient notice and consent is required before booking.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: Number(centreId),
        branch_id: branchId || null,
        scheduled_at: slot.datetime,
        notes: notes || null,
        patient: {
          name: patient.name.trim(),
          phone: patient.phone.trim(),
          email: patient.email.trim() || null,
          gender: patient.gender || null,
          date_of_birth: patient.date_of_birth || null,
          address: patient.address.trim() || null,
        },
        patient_consent: true,
        payment_option: paymentOption,
        online_method: paymentOption === "online" ? onlineMethod : null,
      };
      if (packageId) payload.package_id = Number(packageId);
      else payload.test_type_ids = selectedTests;

      const { data } = await bookReferral(payload);
      const firstId = data.orders?.[0]?.id;
      navigate(firstId ? `/referrals/${firstId}/confirmation` : "/referrals", {
        state: { booked: data },
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Referral booking failed."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading centre…" />;

  if (!centre) {
    return (
      <EmptyState
        title="Centre not found"
        text="This diagnostic centre is unavailable or not open for partner discovery."
        action={
          <Link to="/centres" className="pt-btn">
            Back to centres
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <Link to="/centres" className="pt-back">
        ← Explore centres
      </Link>

      <PageHeader
        title={centre.name}
        subtitle={[centre.address, centre.city, centre.phone].filter(Boolean).join(" · ")}
        actions={
          !approved && centre.partnership_status !== "pending" ? (
            <button type="button" className="pt-btn" onClick={() => setShowRequestModal(true)}>
              Request partnership
            </button>
          ) : approved && !forceBook ? (
            <Link to={`/centres/${centre.id}/book`} className="pt-btn">
              Refer a patient
            </Link>
          ) : null
        }
      />

      <div className="pt-chip-row" style={{ marginBottom: 16 }}>
        <StatusBadge status={centre.partnership_status} />
        {referralCode ? <span className="pt-chip">Code {referralCode}</span> : null}
        {(centre.categories || []).slice(0, 4).map((c) => (
          <span key={c} className="pt-chip">
            {c}
          </span>
        ))}
      </div>

      <Alert type="error">{error}</Alert>

      {branches.length > 0 ? (
        <Panel title="Branches" subtitle="Locations available for referral bookings">
          <CardList>
            {branches.map((b) => (
              <ListRow
                key={b.id}
                title={b.name}
                meta={[b.city, b.phone, b.address].filter(Boolean).join(" · ")}
              />
            ))}
          </CardList>
        </Panel>
      ) : null}

      {!approved ? (
        <Panel
          title="Services overview"
          subtitle="Pricing and booking open after the centre approves your partnership."
        >
          <CardList>
            {tests.slice(0, 12).map((t) => (
              <ListRow
                key={t.id}
                title={t.name}
                meta={t.category?.name || t.modality || "Diagnostic test"}
              />
            ))}
            {packages.slice(0, 6).map((p) => (
              <ListRow key={p.id} title={p.package_name} meta="Package" />
            ))}
          </CardList>
          {centre.partnership_status === "pending" ? (
            <Alert type="info">Your partnership request is pending centre approval.</Alert>
          ) : null}
        </Panel>
      ) : (
        <>
          <Panel title="1. Patient details" subtitle="Capture patient information for this referral.">
            <FormGrid columns={2}>
              <div className="pt-field">
                <label>Patient name *</label>
                <input
                  value={patient.name}
                  onChange={(e) => setPatient((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="pt-field">
                <label>Patient mobile *</label>
                <input
                  value={patient.phone}
                  onChange={(e) => setPatient((p) => ({ ...p, phone: e.target.value }))}
                  required
                />
              </div>
              <div className="pt-field">
                <label>Email</label>
                <input
                  type="email"
                  value={patient.email}
                  onChange={(e) => setPatient((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="pt-field">
                <label>Gender</label>
                <select
                  value={patient.gender}
                  onChange={(e) => setPatient((p) => ({ ...p, gender: e.target.value }))}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </FormGrid>
            <label className="pt-check-row">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                I confirm the patient has been informed and consents to this diagnostic referral
                booking.
              </span>
            </label>
          </Panel>

          <Panel title="2. Tests / packages" subtitle="Select what the patient needs.">
            {packages.length > 0 ? (
              <div className="pt-field">
                <label>Package</label>
                <select
                  value={packageId}
                  onChange={(e) => {
                    setPackageId(e.target.value);
                    setSelectedTests([]);
                  }}
                >
                  <option value="">No package — select tests</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.package_name}
                      {p.offer_percentage ? ` (${p.offer_percentage}% off)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <CardList>
              {tests.map((t) => (
                <label key={t.id} className="pt-card-row" style={{ cursor: "pointer" }}>
                  <div className="pt-card-row__main">
                    <strong>
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(t.id)}
                        disabled={Boolean(packageId)}
                        onChange={() => toggleTest(t.id)}
                        style={{ marginRight: 8 }}
                      />
                      {t.name}
                    </strong>
                    <div className="pt-card-row__meta">{t.category?.name || t.modality || ""}</div>
                  </div>
                  <strong>{money(t.price, { compact: true })}</strong>
                </label>
              ))}
            </CardList>

            {estimatedTotal != null ? (
              <p className="pt-muted" style={{ marginTop: 12 }}>
                Estimated total: <strong>{money(estimatedTotal)}</strong>
              </p>
            ) : null}
          </Panel>

          <Panel title="3. Slot & payment" subtitle="Choose branch, appointment time and payment mode.">
            <FormGrid columns={2}>
              {branches.length > 0 ? (
                <div className="pt-field">
                  <label>Branch</label>
                  <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">Any / main</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="pt-field">
                <label>Date</label>
                <input type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="pt-field">
                <label>Payment</label>
                <select value={paymentOption} onChange={(e) => setPaymentOption(e.target.value)}>
                  <option value="pay_on_visit">Pay on visit</option>
                  <option value="online">Online</option>
                </select>
              </div>
              {paymentOption === "online" ? (
                <div className="pt-field">
                  <label>Online method</label>
                  <select value={onlineMethod} onChange={(e) => setOnlineMethod(e.target.value)}>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              ) : null}
            </FormGrid>

            <div className="pt-slot-grid">
              {slots.length === 0 ? (
                <p className="pt-muted">No slots available for this date.</p>
              ) : (
                slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    className={`pt-slot${slot?.time === s.time ? " is-active" : ""}`}
                    disabled={!s.available}
                    onClick={() => setSlot(s)}
                  >
                    {s.time}
                  </button>
                ))
              )}
            </div>

            <div className="pt-field">
              <label>Notes</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </Panel>

          <button type="button" className="pt-btn pt-btn--block" disabled={saving} onClick={handleBook}>
            {saving ? "Submitting referral…" : "Submit referral booking"}
          </button>
        </>
      )}

      {showRequestModal ? (
        <div className="pt-modal-backdrop" role="dialog" aria-modal="true">
          <div className="pt-modal">
            <h3>Request partnership</h3>
            <p>
              Introduce your practice to <strong>{centre.name}</strong>.
            </p>
            <div className="pt-field">
              <label htmlFor="centre-request-message">Message</label>
              <textarea
                id="centre-request-message"
                rows={4}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
              />
            </div>
            <div className="pt-modal__actions">
              <button type="button" className="pt-btn pt-btn--ghost" onClick={() => setShowRequestModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="pt-btn"
                disabled={requesting}
                onClick={submitPartnershipRequest}
              >
                {requesting ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
