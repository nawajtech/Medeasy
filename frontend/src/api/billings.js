import api from "./axios";

export const API_BASE = "http://127.0.0.1:8000/api";

export const getBillings = () => api.get("/billings");
export const getPatientBalance = (patientId) =>
  api.get(`/patients/${patientId}/billing-balance`);
export const openBillingInvoice = (billingId) => {
  window.open(`${API_BASE}/billings/${billingId}/invoice`, "_blank");
};
