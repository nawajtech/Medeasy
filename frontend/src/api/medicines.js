import api from "./axios";
import { API_BASE_URL } from "../config/env";

export const getMedicines = (params) => api.get("/pharmacy/medicines", { params });
export const createMedicine = (data) => api.post("/pharmacy/medicines", data);
export const updateMedicine = (id, data) => api.put(`/pharmacy/medicines/${id}`, data);
export const deleteMedicine = (id) => api.delete(`/pharmacy/medicines/${id}`);

export const importMedicines = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/pharmacy/medicines/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export async function exportMedicines() {
  const token = localStorage.getItem("medeasy_token");
  const response = await fetch(`${API_BASE_URL}/pharmacy/medicines/export`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/csv",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Export failed.");
  }

  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `medicines-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
