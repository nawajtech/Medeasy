import api from "./axios";

export const getCompanies = () => api.get("/companies");
export const getCompany = (id) => api.get(`/companies/${id}`);
export const createCompany = (data) => api.post("/companies", data);
export const updateCompany = (id, data) => api.put(`/companies/${id}`, data);
export const deleteCompany = (id) => api.delete(`/companies/${id}`);
