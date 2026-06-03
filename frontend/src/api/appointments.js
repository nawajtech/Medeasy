import api from "./axios";
import { API_BASE_URL } from "../config/env";

export const API_BASE = API_BASE_URL;

export const getAppointments = (params) => api.get("/appointments", { params });
export const getAppointment = (id) => api.get(`/appointments/${id}`);
export const createAppointment = (data) => api.post("/appointments", data);
export const updateAppointment = (id, data) => api.put(`/appointments/${id}`, data);
export const deleteAppointment = (id) => api.delete(`/appointments/${id}`);

export const openPrescription = (id) => {
  window.open(`${API_BASE}/appointments/${id}/prescription`, "_blank");
};

export const getAppointmentVitals = (id) => api.get(`/appointments/${id}/vitals`);
export const saveAppointmentVitals = (id, data) => api.put(`/appointments/${id}/vitals`, data);
