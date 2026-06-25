import api from "./axios";

// ── Categories ─────────────────────────────────────
export const getDiagnosticCategories = (params) => api.get("/diagnostics/categories", { params });
export const createDiagnosticCategory = (data) => api.post("/diagnostics/categories", data);
export const updateDiagnosticCategory = (id, data) => api.put(`/diagnostics/categories/${id}`, data);
export const deleteDiagnosticCategory = (id) => api.delete(`/diagnostics/categories/${id}`);

// ── Tests (types) ──────────────────────────────────
export const getDiagnosticTypes = (params) => api.get("/diagnostics/types", { params });
export const createDiagnosticType = (data) => api.post("/diagnostics/types", data);
export const updateDiagnosticType = (id, data) => api.put(`/diagnostics/types/${id}`, data);
export const deleteDiagnosticType = (id) => api.delete(`/diagnostics/types/${id}`);

// ── Orders ─────────────────────────────────────────
export const getDiagnosticOrders = (params) => api.get("/diagnostics/orders", { params });
export const getDiagnosticOrder = (id) => api.get(`/diagnostics/orders/${id}`);
export const createDiagnosticOrder = (data) => api.post("/diagnostics/orders", data);
export const scheduleDiagnosticOrder = (id, data) => api.patch(`/diagnostics/orders/${id}/schedule`, data);
export const startDiagnosticOrder = (id) => api.patch(`/diagnostics/orders/${id}/start`);
export const uploadDiagnosticReport = (id, data) => api.post(`/diagnostics/orders/${id}/report`, data);
export const approveDiagnosticReport = (id) => api.patch(`/diagnostics/orders/${id}/approve`);
export const cancelDiagnosticOrder = (id) => api.patch(`/diagnostics/orders/${id}/cancel`);
