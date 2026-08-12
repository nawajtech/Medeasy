import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  bookAppointment,
  getCentre,
  getCentreServices,
  getCentreSlots,
  lookupReferral,
} from "../api/portal";
import { getApiErrorMessage } from "../../utils/apiError";

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CentreBooking() {
  const { centreId } = useParams();
  const navigate = useNavigate();

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
  const [hasReferral, setHasReferral] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralInfo, setReferralInfo] = useState(null);
  const [referralError, setReferralError] = useState("");
  const [paymentOption, setPaymentOption] = useState("pay_on_visit");
  const [onlineMethod, setOnlineMethod] = useState("upi");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [centreRes, servicesRes] = await Promise.all([
          getCentre(centreId),
          getCentreServices(centreId),
        ]);
        if (!active) return;
        setCentre(centreRes.data.centre);
        setBranches(centreRes.data.branches ?? []);
        setTests(servicesRes.data.tests ?? []);
        setPackages(servicesRes.data.packages ?? []);
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
  }, [centreId, date]);

  const estimatedTotal = useMemo(() => {
    if (packageId) {
      const pkg = packages.find((p) => String(p.id) === String(packageId));
      return pkg?.package_price ?? null;
    }
    return selectedTests.reduce((sum, id) => {
      const test = tests.find((t) => t.id === id);
      return sum + (Number(test?.price) || 0);
    }, 0);
  }, [packageId, packages, selectedTests, tests]);

  const toggleTest = (id) => {
    setPackageId("");
    setSelectedTests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const verifyReferral = async () => {
    setReferralError("");
    setReferralInfo(null);
    if (!referralCode.trim()) {
      setReferralError("Enter a referral doctor code.");
      return;
    }
    try {
      const { data } = await lookupReferral(centreId, { code: referralCode.trim() });
      setReferralInfo(data.referral);
    } catch (err) {
      setReferralError(getApiErrorMessage(err, "Invalid referral code."));
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
    if (hasReferral && !referralCode.trim()) {
      setError("Enter your referral doctor code, or choose No.");
      return;
    }
    if (paymentOption === "online" && !onlineMethod) {
      setError("Choose an online payment method.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_id: Number(centreId),
        branch_id: branchId || null,
        scheduled_at: slot.datetime,
        notes: notes || null,
        has_referral: hasReferral,
        referral_code: hasReferral ? referralCode.trim() : null,
        payment_option: paymentOption,
        online_method: paymentOption === "online" ? onlineMethod : null,
      };
      if (packageId) {
        payload.package_id = Number(packageId);
      } else {
        payload.test_type_ids = selectedTests;
      }

      const { data } = await bookAppointment(payload);
      const firstId = data.orders?.[0]?.id;
      navigate(firstId ? `/appointments/${firstId}/confirmation` : "/appointments", {
        state: { booked: data },
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Booking failed."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="pt-empty">Loading centre…</div>;
  }

  if (!centre) {
    return (
      <div className="pt-empty">
        Centre not found. <Link to="/">Back to centres</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="pt-back">
        ← All centres
      </Link>
      <div className="pt-page-head">
        <h1 className="pt-page-title">{centre.name}</h1>
        <p className="pt-page-sub">
          {[centre.address, centre.city].filter(Boolean).join(", ")}
          {centre.phone ? ` · ${centre.phone}` : ""}
        </p>
      </div>

      <div className="pt-panel">
        <h2>
          <span className="pt-step">1</span>
          Select tests / packages
        </h2>
        <p className="pt-panel__hint">Choose one package or one or more individual tests.</p>
        {packages.length > 0 ? (
          <div className="pt-list" style={{ marginBottom: 16 }}>
            {packages.map((pkg) => (
              <label
                key={pkg.id}
                className={`pt-check ${String(packageId) === String(pkg.id) ? "is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="package"
                  checked={String(packageId) === String(pkg.id)}
                  onChange={() => {
                    setPackageId(String(pkg.id));
                    setSelectedTests([]);
                  }}
                />
                <div className="pt-check__meta">
                  <strong>{pkg.package_name}</strong>
                  <span>
                    {pkg.offer_percentage ? `${pkg.offer_percentage}% off` : "Package"}
                    {pkg.description ? ` · ${pkg.description}` : ""}
                  </span>
                </div>
                {pkg.package_price != null ? <div className="pt-price">₹{pkg.package_price}</div> : null}
              </label>
            ))}
          </div>
        ) : null}

        <div className="pt-list">
          {tests.map((test) => (
            <label
              key={test.id}
              className={`pt-check ${selectedTests.includes(test.id) ? "is-selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={selectedTests.includes(test.id)}
                onChange={() => toggleTest(test.id)}
              />
              <div className="pt-check__meta">
                <strong>{test.name}</strong>
                <span>
                  {[test.category?.name, test.modality].filter(Boolean).join(" · ") || "Diagnostic test"}
                </span>
              </div>
              <div className="pt-price">₹{Number(test.price || 0).toFixed(2)}</div>
            </label>
          ))}
        </div>
        {tests.length === 0 && packages.length === 0 ? (
          <div className="pt-empty">No tests listed for this centre yet.</div>
        ) : null}
      </div>

      <div className="pt-panel">
        <h2>
          <span className="pt-step">2</span>
          Choose date & slot
        </h2>
        <p className="pt-panel__hint">Pick a visit or sample-collection time.</p>
        {branches.length > 0 ? (
          <div className="pt-field" style={{ marginBottom: 14 }}>
            <label htmlFor="branch">Branch (optional)</label>
            <select id="branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Any / main centre</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="pt-field" style={{ marginBottom: 14 }}>
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            min={todayIso()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="pt-slots">
          {slots.length === 0 ? (
            <p className="pt-page-sub">No slots available for this date.</p>
          ) : (
            slots.map((s) => (
              <button
                key={s.time}
                type="button"
                className={`pt-slot ${slot?.time === s.time ? "is-active" : ""}`}
                disabled={!s.available}
                onClick={() => setSlot(s)}
              >
                {s.time}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="pt-panel">
        <h2>
          <span className="pt-step">3</span>
          Referral doctor
        </h2>
        <p className="pt-panel__hint">Optional — only if you have a referral from a doctor.</p>
        <p className="pt-page-sub" style={{ marginBottom: 12 }}>
          Do you have a referral from a doctor?
        </p>
        <div className="pt-referral">
          <div className="pt-choice">
            <label className={hasReferral ? "is-active" : ""}>
              <input
                type="radio"
                name="has_referral"
                checked={hasReferral}
                onChange={() => {
                  setHasReferral(true);
                  setReferralInfo(null);
                }}
              />
              Yes
            </label>
            <label className={!hasReferral ? "is-active" : ""}>
              <input
                type="radio"
                name="has_referral"
                checked={!hasReferral}
                onChange={() => {
                  setHasReferral(false);
                  setReferralCode("");
                  setReferralInfo(null);
                  setReferralError("");
                }}
              />
              No
            </label>
          </div>

          {hasReferral ? (
            <>
              <div className="pt-field">
                <label htmlFor="referral_code">Referral Doctor Code</label>
                <input
                  id="referral_code"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    setReferralInfo(null);
                  }}
                  placeholder="Enter code from your doctor"
                />
              </div>
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={verifyReferral}>
                Verify code
              </button>
              {referralInfo ? (
                <p className="pt-success">
                  Verified: {referralInfo.name}
                  {referralInfo.type ? ` (${referralInfo.type})` : ""}
                </p>
              ) : null}
              {referralError ? <p className="pt-error">{referralError}</p> : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="pt-panel">
        <h2>
          <span className="pt-step">4</span>
          Notes
        </h2>
        <div className="pt-field">
          <label htmlFor="notes">Additional notes (optional)</label>
          <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="pt-panel">
        <h2>
          <span className="pt-step">5</span>
          Payment
        </h2>
        <p className="pt-panel__hint">Choose how you want to pay for this booking.</p>

        <div className="pt-pay-options">
          <button
            type="button"
            className={`pt-pay-card ${paymentOption === "pay_on_visit" ? "is-active" : ""}`}
            onClick={() => setPaymentOption("pay_on_visit")}
          >
            <span className="pt-pay-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="22" height="22">
                <path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z" strokeWidth="1.8" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <strong>Pay on visit</strong>
            <span>Pay cash / UPI at the diagnostic centre when you arrive.</span>
          </button>

          <button
            type="button"
            className={`pt-pay-card ${paymentOption === "online" ? "is-active" : ""}`}
            onClick={() => setPaymentOption("online")}
          >
            <span className="pt-pay-card__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="22" height="22">
                <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="1.8" />
                <path d="M3 10h18M7 15h4" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <strong>Pay online</strong>
            <span>Pay now with UPI or card and confirm your booking instantly.</span>
          </button>
        </div>

        {paymentOption === "online" ? (
          <div className="pt-online-methods">
            <p className="pt-panel__hint" style={{ marginBottom: 10 }}>
              Select online method
            </p>
            <div className="pt-choice">
              <label className={onlineMethod === "upi" ? "is-active" : ""}>
                <input
                  type="radio"
                  name="online_method"
                  checked={onlineMethod === "upi"}
                  onChange={() => setOnlineMethod("upi")}
                />
                UPI
              </label>
              <label className={onlineMethod === "card" ? "is-active" : ""}>
                <input
                  type="radio"
                  name="online_method"
                  checked={onlineMethod === "card"}
                  onChange={() => setOnlineMethod("card")}
                />
                Card
              </label>
            </div>
            <div className="pt-pay-note">
              Amount due now:{" "}
              <strong>
                {estimatedTotal != null ? `₹${Number(estimatedTotal).toFixed(2)}` : "—"}
              </strong>
              . Payment will be recorded against your booking.
            </div>
          </div>
        ) : (
          <div className="pt-pay-note">
            No payment needed now. Please settle the bill at the centre during your visit.
          </div>
        )}
      </div>

      {error ? <p className="pt-error" style={{ marginTop: 12 }}>{error}</p> : null}

      <div className="pt-sticky-cta">
        <div className="pt-sticky-cta__row">
          <span>{paymentOption === "online" ? "Pay now" : "Amount due on visit"}</span>
          <strong>
            {estimatedTotal != null ? `₹${Number(estimatedTotal).toFixed(2)}` : "—"}
          </strong>
        </div>
        <button type="button" className="pt-btn pt-btn--block" disabled={saving} onClick={handleBook}>
          {saving
            ? paymentOption === "online"
              ? "Processing payment…"
              : "Booking…"
            : paymentOption === "online"
              ? "Pay & confirm booking"
              : "Confirm booking"}
        </button>
      </div>
    </div>
  );
}
