import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  cancelAppointment,
  getAppointment,
  getCentreSlots,
  rescheduleAppointment,
} from "../api/portal";
import { getApiErrorMessage } from "../../utils/apiError";

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function AppointmentDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [canCancel, setCanCancel] = useState(false);
  const [canReschedule, setCanReschedule] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getAppointment(orderId);
      setOrder(data.order);
      setCanCancel(Boolean(data.can_cancel));
      setCanReschedule(Boolean(data.can_reschedule));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load appointment."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderId]);

  useEffect(() => {
    if (!showReschedule || !order?.company_id) return;
    let active = true;
    (async () => {
      setSlot(null);
      try {
        const { data } = await getCentreSlots(order.company_id, { date });
        if (active) setSlots(data.slots ?? []);
      } catch {
        if (active) setSlots([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [showReschedule, order?.company_id, date]);

  const handleCancel = async () => {
    if (!window.confirm("Cancel this appointment?")) return;
    setBusy(true);
    setMessage("");
    try {
      await cancelAppointment(orderId);
      setMessage("Appointment cancelled.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Cancel failed."));
    } finally {
      setBusy(false);
    }
  };

  const handleReschedule = async () => {
    if (!slot?.datetime) {
      setError("Select a new slot.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await rescheduleAppointment(orderId, { scheduled_at: slot.datetime });
      setMessage("Appointment rescheduled.");
      setShowReschedule(false);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Reschedule failed."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="pt-empty">Loading…</div>;
  if (!order) {
    return (
      <div className="pt-empty">
        {error || "Appointment not found."} <Link to="/appointments">Back</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/appointments" className="pt-back">
        ← Appointments
      </Link>
      <div className="pt-page-head">
        <h1 className="pt-page-title">{order.testType?.name || "Appointment"}</h1>
        <p className="pt-page-sub">
          {order.order_number}{" "}
          <span className={`pt-status pt-status--${order.status}`}>{order.status}</span>
        </p>
      </div>

      <div className="pt-panel">
        <h2>Details</h2>
        <div className="pt-row">
          <span>Centre</span>
          <strong>{order.company?.name}</strong>
        </div>
        <div className="pt-row">
          <span>When</span>
          <strong>{order.scheduled_at ? new Date(order.scheduled_at).toLocaleString() : "—"}</strong>
        </div>
        <div className="pt-row">
          <span>Branch</span>
          <strong>{order.branch?.name || "Main"}</strong>
        </div>
        <div className="pt-row">
          <span>Amount</span>
          <strong>₹{Number(order.grand_total ?? order.net_amount ?? 0).toFixed(2)}</strong>
        </div>
        <div className="pt-row">
          <span>Payment</span>
          <strong>
            {order.payment_method === "pay_on_visit"
              ? "Pay on visit"
              : order.payment_method
                ? String(order.payment_method).toUpperCase()
                : "—"}
          </strong>
        </div>
        <div className="pt-row">
          <span>Payment status</span>
          <span
            className={`pt-status ${
              order.payment_status === "paid" ? "pt-status--paid" : "pt-status--unpaid"
            }`}
          >
            {order.payment_status === "paid"
              ? "Paid"
              : order.payment_status === "partial"
                ? "Partial"
                : "Unpaid"}
          </span>
        </div>
        {Number(order.due_amount) > 0 ? (
          <div className="pt-row">
            <span>Due</span>
            <strong>₹{Number(order.due_amount).toFixed(2)}</strong>
          </div>
        ) : null}
        {order.referral_partner_name ? (
          <div className="pt-row">
            <span>Referral doctor</span>
            <strong>
              {order.referral_partner_name}
              {order.referralPartner?.referral_code ? ` (${order.referralPartner.referral_code})` : ""}
            </strong>
          </div>
        ) : null}
      </div>

      {message ? <p className="pt-success" style={{ marginTop: 12 }}>{message}</p> : null}
      {error ? <p className="pt-error" style={{ marginTop: 12 }}>{error}</p> : null}

      <div className="pt-actions pt-actions--stack">
        {canReschedule ? (
          <button type="button" className="pt-btn pt-btn--ghost" disabled={busy} onClick={() => setShowReschedule((v) => !v)}>
            Reschedule
          </button>
        ) : null}
        {canCancel ? (
          <button type="button" className="pt-btn pt-btn--danger" disabled={busy} onClick={handleCancel}>
            Cancel appointment
          </button>
        ) : null}
        <button type="button" className="pt-btn pt-btn--ghost" onClick={() => navigate(`/centres/${order.company_id}`)}>
          Book again
        </button>
      </div>

      {showReschedule ? (
        <div className="pt-panel" style={{ marginTop: 16 }}>
          <h2>New slot</h2>
          <div className="pt-field" style={{ marginBottom: 12 }}>
            <label htmlFor="reschedule-date">Date</label>
            <input id="reschedule-date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="pt-slots">
            {slots.map((s) => (
              <button
                key={s.time}
                type="button"
                className={`pt-slot ${slot?.time === s.time ? "is-active" : ""}`}
                disabled={!s.available}
                onClick={() => setSlot(s)}
              >
                {s.time}
              </button>
            ))}
          </div>
          <div className="pt-actions">
            <button type="button" className="pt-btn" disabled={busy} onClick={handleReschedule}>
              Save new time
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
