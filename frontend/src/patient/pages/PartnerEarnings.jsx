import { useEffect, useState } from "react";
import { getEarnings } from "../api/portal";
import {
  Alert,
  CardList,
  EmptyState,
  ListRow,
  LoadingBlock,
  PageHeader,
  Section,
  StatCard,
  StatGrid,
  StatusBadge,
} from "../components/ui";
import { formatDate, money } from "../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PartnerEarnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: res } = await getEarnings();
        if (active) setData(res);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load earnings."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const summary = data?.summary || {};

  return (
    <div>
      <PageHeader
        title="Earnings"
        subtitle="View-only commission ledger. Payouts are recorded by diagnostic centres."
      />

      <Alert type="error">{error}</Alert>

      {loading ? (
        <LoadingBlock label="Loading earnings…" />
      ) : (
        <>
          <StatGrid>
            <StatCard tone="blue" label="Eligible earnings" value={money(summary.eligible_earnings)} />
            <StatCard tone="green" label="Pending commission" value={money(summary.pending_commission)} />
            <StatCard label="Paid commission" value={money(summary.paid_commission)} />
          </StatGrid>

          <Section title="By centre" subtitle="Centre-specific commercial eligibility">
            {(data?.by_centre || []).length === 0 ? (
              <EmptyState title="No approved partnerships yet" text="Earnings appear after centres approve you and referrals complete." />
            ) : (
              <CardList>
                {data.by_centre.map((row) => (
                  <ListRow
                    key={row.relationship_id}
                    title={row.centre_name}
                    meta={`Code ${row.referral_code}`}
                    right={
                      <>
                        <span className="pt-muted">Earned {money(row.total_earned)}</span>
                        <span className="pt-muted">Paid {money(row.total_paid)}</span>
                        <strong>Pending {money(row.balance_pending)}</strong>
                      </>
                    }
                  />
                ))}
              </CardList>
            )}
          </Section>

          <Section title="Ledger" subtitle="Referral commission entries">
            {(data?.ledger || []).length === 0 ? (
              <EmptyState title="No commission entries" text="Completed referrals with eligible commission will show here." />
            ) : (
              <CardList>
                {data.ledger.map((row) => (
                  <ListRow
                    key={row.id}
                    title={row.patient_name || row.order_number}
                    meta={`${row.centre} · ${row.test_name} · ${formatDate(row.date)}`}
                    right={
                      <>
                        <strong>{money(row.commission)}</strong>
                        <StatusBadge status={row.eligibility} />
                      </>
                    }
                  />
                ))}
              </CardList>
            )}
          </Section>

          <Section title="Payout history" subtitle="Payments recorded by centres">
            {(data?.payouts || []).length === 0 ? (
              <EmptyState title="No payouts yet" text="When a centre records a payout, it will appear here." />
            ) : (
              <CardList>
                {data.payouts.map((row) => (
                  <ListRow
                    key={row.id}
                    title={row.centre || "Centre"}
                    meta={`${formatDate(row.paid_at)} · ${row.method || "—"}${row.reference ? ` · ${row.reference}` : ""}`}
                    right={<strong>{money(row.amount)}</strong>}
                  />
                ))}
              </CardList>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
