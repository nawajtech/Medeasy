import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAppointments } from "../api/portal";
import { getApiErrorMessage } from "../../utils/apiError";

function formatWhen(order) {
  if (!order?.scheduled_at) return "Not scheduled";
  try {
    return new Date(order.scheduled_at).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return order.scheduled_at;
  }
}

export default function Appointments() {
  const [scope, setScope] = useState("upcoming");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await listAppointments({ scope });
        if (active) setOrders(data?.data ?? []);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load appointments."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [scope]);

  return (
    <div>
      <div className="pt-page-head">
        <h1 className="pt-page-title">My appointments</h1>
        <p className="pt-page-sub">Track upcoming visits and review past bookings.</p>
      </div>

      <div className="pt-tabs" role="tablist" aria-label="Appointment filters">
        {[
          ["upcoming", "Upcoming"],
          ["past", "Past"],
          ["all", "All"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={scope === value}
            className={scope === value ? "is-active" : undefined}
            onClick={() => setScope(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="pt-error">{error}</p> : null}
      {loading ? (
        <div className="pt-empty">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="pt-empty">
          No appointments here. <Link to="/">Book a centre</Link>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <article className="pt-appt-card" key={order.id}>
              <div className="pt-appt-card__head">
                <strong>{order.testType?.name || "Diagnostic test"}</strong>
                <span className={`pt-status pt-status--${order.status}`}>{order.status}</span>
              </div>
              <div className="pt-appt-card__meta">
                {order.company?.name}
                <br />
                {formatWhen(order)}
              </div>
              <div className="pt-appt-card__actions">
                <div>
                  <span className="pt-price">
                    ₹{Number(order.grand_total ?? order.net_amount ?? 0).toFixed(2)}
                  </span>
                  <div className="pt-page-sub" style={{ margin: "4px 0 0" }}>
                    {order.payment_status === "paid"
                      ? "Paid"
                      : order.payment_method === "pay_on_visit"
                        ? "Pay on visit"
                        : "Unpaid"}
                  </div>
                </div>
                <Link className="pt-btn pt-btn--ghost pt-btn--sm" to={`/appointments/${order.id}`}>
                  View details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
