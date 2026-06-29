import api from "./axios";

export const getPatients = (params) => api.get("/patients", { params });
export const getPatient = (id) => api.get(`/patients/${id}`);
export const getPatientHistory = (id) => api.get(`/patients/${id}/history`);
export const getPatientWallet = (id) => api.get(`/patients/${id}/wallet`);
export const createPatient = (data) => api.post("/patients", data);
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data);
export const deletePatient = (id) => api.delete(`/patients/${id}`);
