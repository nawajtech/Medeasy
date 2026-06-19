import api from "./axios";
import { openAuthenticatedDocument } from "../utils/openDocument";

export const getAppointments = (params) => api.get("/appointments", { params });
export const getAppointment = (id) => api.get(`/appointments/${id}`);
export const createAppointment = (data) => api.post("/appointments", data);
export const updateAppointment = (id, data) => api.put(`/appointments/${id}`, data);
export const deleteAppointment = (id) => api.delete(`/appointments/${id}`);

export const uploadPrescription = (id, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/appointments/${id}/prescription/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const openPrescription = (id) =>
  openAuthenticatedDocument(`/appointments/${id}/prescription`);

export const getAppointmentVitals = (id) => api.get(`/appointments/${id}/vitals`);
export const saveAppointmentVitals = (id, data) => api.put(`/appointments/${id}/vitals`, data);
