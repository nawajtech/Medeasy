import { Link, useLocation, useParams } from "react-router-dom";
import { money } from "../utils/format";
import { formatDateTime } from "../utils/format";

export default function BookingConfirmation() {
  const { orderId } = useParams();
  const { state } = useLocation();
  const booked = state?.booked;
  const orders = booked?.orders ?? [];
  const primary = orders[0];
  const paymentOption = booked?.payment_option;
  const paymentStatus = booked?.payment_status || primary?.payment_status;

  return (
    <div className="pt-surface-panel pt-confirm-card">
      <div className="pt-confirm-card__icon" aria-hidden="true">
        ✓
      </div>
      <h1 className="pt-page-title" style={{ marginBottom: 8 }}>
        Referral booking submitted
      </h1>
      <p className="pt-page-sub">
        The diagnostic booking is scheduled
        {primary?.scheduled_at ? ` for ${formatDateTime(primary.scheduled_at)}` : ""}.
        {booked?.referral_code ? ` Referral code ${booked.referral_code} was applied.` : ""}
      </p>

      {orders.length > 0 ? (
        <div className="pt-detail-grid" style={{ textAlign: "left", marginTop: 20 }}>
          {orders.map((order) => (
            <div className="pt-detail-row" key={order.id}>
              <div>
                <strong>{order.testType?.name || "Test"}</strong>
                <div className="pt-muted">
                  {order.order_number} · {order.patient?.name || ""}
                </div>
              </div>
              <strong>{money(order.grand_total)}</strong>
            </div>
          ))}
          {booked?.total_grand != null ? (
            <div className="pt-detail-row">
              <strong>Total</strong>
              <strong>{money(booked.total_grand)}</strong>
            </div>
          ) : null}
          <div className="pt-detail-row">
            <span>Payment</span>
            <strong>
              {paymentOption === "online" || paymentStatus === "paid" ? "Paid online" : "Pay on visit"}
            </strong>
          </div>
        </div>
      ) : (
        <p className="pt-page-sub">Booking reference #{orderId}</p>
      )}

      <div className="pt-dash-hero__actions" style={{ justifyContent: "center", marginTop: 24 }}>
        <Link className="pt-btn" to="/referrals">
          My referrals
        </Link>
        <Link className="pt-btn pt-btn--ghost" to="/">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
