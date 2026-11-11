import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReferral } from "../api/portal";
import {
  Alert,
  EmptyState,
  LoadingBlock,
  PageHeader,
  Panel,
  StatusBadge,
} from "../components/ui";
import { formatDateTime, money } from "../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";

export default function ReferralDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getReferral(orderId);
        if (active) setOrder(data.order);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load referral."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) return <LoadingBlock label="Loading referral…" />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!order) {
    return (
      <EmptyState
        title="Referral not found"
        text="This referral may belong to another partner account."
        action={
          <Link to="/referrals" className="pt-btn">
            Back to referrals
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <Link to="/referrals" className="pt-back">
        ← My referrals
      </Link>

      <PageHeader
        title={order.booking_id || `Referral #${order.id}`}
        subtitle={`${order.patient_name || "Patient"}${order.patient_phone ? ` · ${order.patient_phone}` : ""}`}
        actions={<StatusBadge status={order.status} />}
      />

      <Panel title="Booking details">
        <div className="pt-detail-grid">
          <div className="pt-detail-row">
            <span>Centre</span>
            <strong>{order.centre}</strong>
          </div>
          <div className="pt-detail-row">
            <span>Test / package</span>
            <strong>{order.test_name || "—"}</strong>
          </div>
          <div className="pt-detail-row">
            <span>Branch</span>
            <strong>{order.branch || "—"}</strong>
          </div>
          <div className="pt-detail-row">
            <span>Booked</span>
            <strong>{formatDateTime(order.booking_date)}</strong>
          </div>
          <div className="pt-detail-row">
            <span>Appointment</span>
            <strong>{formatDateTime(order.appointment_date)}</strong>
          </div>
          <div className="pt-detail-row">
            <span>Referral code</span>
            <strong>{order.referral_code || "—"}</strong>
          </div>
          <div className="pt-detail-row">
            <span>Commission</span>
            <strong>
              {money(order.commission_amount)} · <StatusBadge status={order.commission_status} />
            </strong>
          </div>
          {order.amount != null ? (
            <div className="pt-detail-row">
              <span>Order amount</span>
              <strong>{money(order.amount)}</strong>
            </div>
          ) : null}
          {order.notes ? (
            <div className="pt-detail-row">
              <span>Notes</span>
              <strong>{order.notes}</strong>
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
