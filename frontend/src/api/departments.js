import api from "./axios";
import { buildImportFormData, downloadSpreadsheetExport } from "../utils/spreadsheet";

export const getDepartments = (params) => api.get("/departments", { params });
export const getDepartment = (id) => api.get(`/departments/${id}`);
export const createDepartment = (data) => api.post("/departments", data);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);

export const exportDepartments = (params) => downloadSpreadsheetExport("/departments/export", params);
export const importDepartments = (file, companyId) =>
  api.post("/departments/import", buildImportFormData(file, companyId), {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const downloadDepartmentSample = () =>
  downloadSpreadsheetExport("/departments/import-template");
