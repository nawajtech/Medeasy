import api from "./axios";

export const getAuditLogs = (params) => api.get("/audit-logs", { params });
export const getAuditLog = (id) => api.get(`/audit-logs/${id}`);
export const getAuditFilters = (params) => api.get("/audit-logs/filters", { params });
export const getAuditActors = (params) => api.get("/audit-logs/actors", { params });
export const getRelatedAuditLogs = (params) => api.get("/audit-logs/related", { params });

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function exportAuditLogs(params = {}) {
  const token = localStorage.getItem("apna_medi_token");
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  const url = `${API_BASE}/audit-logs/export${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/csv",
    },
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
