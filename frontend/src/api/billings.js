import api from "./axios";
import { API_BASE_URL } from "../config/env";

export const API_BASE = API_BASE_URL;

export const getBillings = () => api.get("/billings");
export const getPatientBalance = (patientId) =>
  api.get(`/patients/${patientId}/billing-balance`);
export const openBillingInvoice = (billingId) => {
  window.open(`${API_BASE}/billings/${billingId}/invoice`, "_blank");
};
