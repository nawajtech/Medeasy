import api from "./axios";

// ── Categories ─────────────────────────────────────
export const getLabCategories = (params) => api.get("/lab/categories", { params });
export const createLabCategory = (data) => api.post("/lab/categories", data);
export const updateLabCategory = (id, data) => api.put(`/lab/categories/${id}`, data);
export const deleteLabCategory = (id) => api.delete(`/lab/categories/${id}`);

// ── Tests ──────────────────────────────────────────
export const getLabTests = (params) => api.get("/lab/tests", { params });
export const createLabTest = (data) => api.post("/lab/tests", data);
export const updateLabTest = (id, data) => api.put(`/lab/tests/${id}`, data);
export const deleteLabTest = (id) => api.delete(`/lab/tests/${id}`);

// ── Packages ───────────────────────────────────────
export const getLabPackages = (params) => api.get("/lab/packages", { params });
export const createLabPackage = (data) => api.post("/lab/packages", data);
export const updateLabPackage = (id, data) => api.put(`/lab/packages/${id}`, data);
export const deleteLabPackage = (id) => api.delete(`/lab/packages/${id}`);

// ── Orders ─────────────────────────────────────────
export const getLabOrders = (params) => api.get("/lab/orders", { params });
export const getLabOrder = (id) => api.get(`/lab/orders/${id}`);
export const createLabOrder = (data) => api.post("/lab/orders", data);
export const collectLabSample = (id, data) => api.post(`/lab/orders/${id}/collect`, data);
export const enterLabResults = (id, data) => api.post(`/lab/orders/${id}/results`, data);
export const verifyLabOrder = (id) => api.patch(`/lab/orders/${id}/verify`);
export const approveLabOrder = (id) => api.patch(`/lab/orders/${id}/approve`);
export const cancelLabOrder = (id) => api.patch(`/lab/orders/${id}/cancel`);
