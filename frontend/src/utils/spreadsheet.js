import { API_BASE_URL } from "../config/env";

export async function downloadSpreadsheetExport(path, params = {}, filename = null) {
  const token = localStorage.getItem("medeasy_token");
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}${path}${suffix}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.ms-excel",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Download failed.");
  }

  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename || defaultSpreadsheetFilename(path);
  link.click();
  URL.revokeObjectURL(link.href);
}

function defaultSpreadsheetFilename(path) {
  const date = new Date().toISOString().slice(0, 10);
  if (path.includes("patient-import-sample") || path.includes("patients/import-template")) {
    return `patient-import-sample-${date}.xls`;
  }
  if (path.includes("doctor-import-sample") || path.includes("doctors/import-template")) {
    return `doctor-import-sample-${date}.xls`;
  }
  if (path.includes("patients")) {
    return `patients-${date}.xls`;
  }
  if (path.includes("doctors")) {
    return `doctors-${date}.xls`;
  }
  return `export-${date}.xls`;
}

export const downloadPatientImportTemplate = () =>
  downloadSpreadsheetExport("/patients/import-template");

export const downloadDoctorImportTemplate = () =>
  downloadSpreadsheetExport("/doctors/import-template");

export function buildImportFormData(file, companyId) {
  const formData = new FormData();
  formData.append("file", file);
  if (companyId) {
    formData.append("company_id", companyId);
  }
  return formData;
}
