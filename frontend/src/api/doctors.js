import api from "./axios";
import { buildImportFormData, downloadDoctorImportTemplate, downloadSpreadsheetExport } from "../utils/spreadsheet";

export const getDoctors = (params) => api.get("/doctors", { params });
export const getDoctor = (id) => api.get(`/doctors/${id}`);
export const createDoctor = (data) => api.post("/doctors", data);
export const updateDoctor = (id, data) => api.put(`/doctors/${id}`, data);
export const deleteDoctor = (id) => api.delete(`/doctors/${id}`);

export const importDoctors = (file, companyId) =>
  api.post("/doctors/import", buildImportFormData(file, companyId), {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const exportDoctors = (params) => downloadSpreadsheetExport("/doctors/export", params);

export const downloadDoctorSample = () => downloadDoctorImportTemplate();
