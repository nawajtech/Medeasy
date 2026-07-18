import api from "./axios";
import { buildImportFormData, downloadPatientImportTemplate, downloadSpreadsheetExport } from "../utils/spreadsheet";

export const getPatients = (params) => api.get("/patients", { params });
export const getPatient = (id) => api.get(`/patients/${id}`);
export const getPatientHistory = (id) => api.get(`/patients/${id}/history`);
export const getPatientWallet = (id) => api.get(`/patients/${id}/wallet`);
export const createPatient = (data) => api.post("/patients", data);
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data);
export const deletePatient = (id) => api.delete(`/patients/${id}`);

export const importPatients = (file, companyId) =>
  api.post("/patients/import", buildImportFormData(file, companyId), {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const exportPatients = (params) => downloadSpreadsheetExport("/patients/export", params);

export const downloadPatientSample = () => downloadPatientImportTemplate();
