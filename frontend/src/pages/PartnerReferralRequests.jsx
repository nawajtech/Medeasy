import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approvePartnerCentreRequest,
  getPartnerCentreRequests,
  rejectPartnerCentreRequest,
} from "../api/referrals";
import { useAuth } from "../auth/AuthContext";
import CompanySelect from "../components/CompanySelect";
import "../components/crud/crud.css";
import { getApiErrorMessage } from "../utils/apiError";
import "./Referrals.css";

const STATUS_FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "", label: "All" },
];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status) {
  switch (status) {
    case "pending":
      return "crud-badge";
    case "approved":
      return "crud-badge crud-badge--active";
    case "rejected":
    case "suspended":
      return "crud-badge crud-badge--inactive";
    default:
      return "crud-badge";
  }
}

export default function PartnerReferralRequests() {
  const { isSuperAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (status) params.status = status;
      if (isSuperAdmin && filterCompanyId) params.company_id = filterCompanyId;
      const { data } = await getPartnerCentreRequests(params);
      setItems(data?.data ?? []);
    } catch (err) {
      setItems([]);
      setError(getApiErrorMessage(err, "Failed to load partnership requests."));
    } finally {
      setLoading(false);
    }
  }, [status, isSuperAdmin, filterCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((row) => {
      const partner = row.partner || {};
      const haystack = [
        partner.name,
        partner.type,
        partner.phone,
        partner.email,
        partner.city,
        partner.state,
        partner.address,
        row.message,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [items, searchTerm]);

  const handleApprove = async (row) => {
    setActingId(row.id);
    setError("");
    try {
      await approvePartnerCentreRequest(row.id, {});
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to approve partnership request."));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (row) => {
    const notes = window.prompt("Optional rejection note:", "") ?? "";
    setActingId(row.id);
    setError("");
    try {
      await rejectPartnerCentreRequest(row.id, { review_notes: notes || null });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reject partnership request."));
    } finally {
      setActingId(null);
    }
  };

  return (
    <section className="page-card ref-page">
      <div className="page-card-header">
        <h2>Requested partner referral</h2>
        <p>Review partnership requests sent by partners from the referral portal.</p>
      </div>

      {error && <div className="crud-alert crud-alert--error">{error}</div>}

      <div className="crud-toolbar">
        <input
          type="search"
          className="crud-search-input"
          placeholder="Search by name, phone, email, type…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search partnership requests"
        />
        {isSuperAdmin && (
          <CompanySelect
            id="partner_req_filter_company"
            label=""
            value={filterCompanyId}
            onChange={(e) => setFilterCompanyId(e.target.value)}
            allLabel="All organizations"
          />
        )}
        <label className="crud-inline-filter">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <span>
          {loading
            ? "Loading…"
            : `${filteredItems.length} request(s)${searchTerm.trim() ? ` of ${items.length}` : ""}`}
        </span>
        <button type="button" className="crud-btn crud-btn--ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="crud-table-wrap">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Partner</th>
              <th>Type</th>
              <th>Contact</th>
              <th>Message</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filteredItems.length === 0 && (
              <tr>
                <td colSpan={7} className="crud-empty">
                  {items.length === 0
                    ? "No partnership requests found."
                    : "No requests match your search."}
                </td>
              </tr>
            )}
            {filteredItems.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.partner?.name || "—"}</strong>
                  {row.partner?.city ? (
                    <div className="ref-address-preview">
                      {[row.partner.city, row.partner.state].filter(Boolean).join(", ")}
                    </div>
                  ) : null}
                </td>
                <td>
                  <span className="ref-type-pill">{row.partner?.type || "—"}</span>
                </td>
                <td>
                  {row.partner?.phone || "—"}
                  <div className="ref-address-preview">{row.partner?.email || ""}</div>
                </td>
                <td>{row.message || "—"}</td>
                <td>
                  <span className={statusClass(row.status)}>{row.status || "—"}</span>
                </td>
                <td>{formatDate(row.created_at)}</td>
                <td>
                  {row.status === "pending" ? (
                    <div className="crud-actions">
                      <button
                        type="button"
                        className="crud-btn crud-btn--primary crud-btn--sm"
                        disabled={actingId === row.id}
                        onClick={() => handleApprove(row)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="crud-btn crud-btn--danger crud-btn--sm"
                        disabled={actingId === row.id}
                        onClick={() => handleReject(row)}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
