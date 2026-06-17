import api from "./axios";
import { openAuthenticatedDocument } from "../utils/openDocument";

export const getBillings = () => api.get("/billings");
export const getPatientBalance = (patientId) =>
  api.get(`/patients/${patientId}/billing-balance`);
export const openBillingInvoice = (billingId) =>
  openAuthenticatedDocument(`/billings/${billingId}/invoice`);
