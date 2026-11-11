import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPartnershipRequests } from "../api/portal";
import {
  Alert,
  CardList,
  EmptyState,
  ListRow,
  LoadingBlock,
  PageHeader,
  StatusBadge,
  Toolbar,
} from "../components/ui";
import { formatDate } from "../utils/format";
import { getApiErrorMessage } from "../../utils/apiError";

export default function PartnershipRequests() {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await listPartnershipRequests(status ? { status } : undefined);
        if (active) setRows(data?.data ?? []);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Could not load requests."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <div>
      <PageHeader
        title="Partnership requests"
        subtitle="Track requests you sent to diagnostic centres."
        actions={
          <Link to="/centres" className="pt-btn">
            Explore centres
          </Link>
        }
      />

      <Toolbar>
        <div className="pt-field" style={{ margin: 0, maxWidth: 280 }}>
          <label htmlFor="status">Filter by status</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </Toolbar>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <LoadingBlock label="Loading requests…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No partnership requests"
          text="Browse diagnostic centres and request a partnership to start referring."
          action={
            <Link to="/centres" className="pt-btn">
              Explore centres
            </Link>
          }
        />
      ) : (
        <CardList>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              title={row.company?.name || "Centre"}
              meta={
                <>
                  {[row.company?.city, formatDate(row.created_at)].filter(Boolean).join(" · ")}
                  {row.message ? <div>{row.message}</div> : null}
                  {row.referral_partner?.referral_code ? (
                    <div>
                      Referral code: <strong>{row.referral_partner.referral_code}</strong>
                    </div>
                  ) : null}
                </>
              }
              right={
                <>
                  <StatusBadge status={row.status} />
                  {row.status === "approved" && row.company?.id ? (
                    <Link to={`/centres/${row.company.id}/book`} className="pt-btn pt-btn--sm">
                      Refer patient
                    </Link>
                  ) : (
                    <Link to={`/centres/${row.company?.id}`} className="pt-btn pt-btn--ghost pt-btn--sm">
                      View centre
                    </Link>
                  )}
                </>
              }
            />
          ))}
        </CardList>
      )}
    </div>
  );
}
