import api from "./axios";

export const getReports = (params) => api.get("/reports", { params });
export const getReport = (id) => api.get(`/reports/${id}`);
export const createReport = (data) => api.post("/reports", data);
export const updateReport = (id, data) => api.put(`/reports/${id}`, data);
export const deleteReport = (id) => api.delete(`/reports/${id}`);
