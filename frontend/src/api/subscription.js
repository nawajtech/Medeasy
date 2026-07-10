import api from "./axios";

export const getPlans = () => api.get("/subscription/plans");
export const getPayments = () => api.get("/subscription/payments");
export const checkout = (payload) => api.post("/subscription/checkout", payload);
export const confirmPayment = (paymentId, payload) =>
  api.post(`/subscription/payments/${paymentId}/confirm`, payload);
