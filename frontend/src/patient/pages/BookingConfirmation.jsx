import { Link, useLocation, useParams } from "react-router-dom";

function money(n) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

export default function BookingConfirmation() {
  const { orderId } = useParams();
  const { state } = useLocation();
  const booked = state?.booked;
  const orders = booked?.orders ?? [];
  const primary = orders[0];
  const paymentOption = booked?.payment_option;
  const paymentStatus = booked?.payment_status || primary?.payment_status;

  return (
    <div className="pt-panel pt-confirm">
      <div className="pt-confirm__icon" aria-hidden="true">
        ✓
      </div>
      <h1 className="pt-page-title">Appointment confirmed</h1>
      <p className="pt-page-sub">
        Your diagnostic booking is scheduled
        {primary?.scheduled_at ? ` for ${new Date(primary.scheduled_at).toLocaleString()}` : ""}.
      </p>

      {orders.length > 0 ? (
        <div style={{ textAlign: "left", marginTop: 20 }}>
          {orders.map((order) => (
            <div className="pt-row" key={order.id}>
              <div>
                <strong>{order.testType?.name || "Test"}</strong>
                <div className="pt-page-sub" style={{ margin: 0 }}>
                  {order.order_number}
                </div>
              </div>
              <span className="pt-price">{money(order.grand_total)}</span>
            </div>
          ))}
          {booked?.total_grand != null ? (
            <div className="pt-row">
              <strong>Total</strong>
              <strong>{money(booked.total_grand)}</strong>
            </div>
          ) : null}

          <div className="pt-row">
            <span>Payment</span>
            <strong>
              {paymentOption === "online" || paymentStatus === "paid"
                ? "Paid online"
                : "Pay on visit"}
            </strong>
          </div>
          <div className="pt-row">
            <span>Status</span>
            <span
              className={`pt-status ${
                paymentStatus === "paid" ? "pt-status--paid" : "pt-status--unpaid"
              }`}
            >
              {paymentStatus === "paid" ? "Paid" : "Unpaid"}
            </span>
          </div>
          {booked?.total_due > 0 ? (
            <div className="pt-row">
              <span>Due on visit</span>
              <strong>{money(booked.total_due)}</strong>
            </div>
          ) : null}

          {primary?.referral_partner_name ? (
            <div className="pt-row">
              <span>Referral doctor</span>
              <strong>{primary.referral_partner_name}</strong>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="pt-page-sub">Booking reference #{orderId}</p>
      )}

      <div className="pt-actions pt-actions--stack" style={{ justifyContent: "center" }}>
        <Link className="pt-btn" to={`/appointments/${orderId}`}>
          View appointment
        </Link>
        <Link className="pt-btn pt-btn--ghost" to="/appointments">
          All appointments
        </Link>
      </div>

      <p style={{ marginTop: 22 }}>
        <span className="pt-powered">
          Powered by <strong>ApnaMedi</strong>
        </span>
      </p>
    </div>
  );
}
