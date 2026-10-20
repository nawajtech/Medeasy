import api from "./axios";

export const getPlans = () => api.get("/subscription/plans");
export const getPayments = () => api.get("/subscription/payments");
export const checkout = (payload) => api.post("/subscription/checkout", payload);
export const confirmPayment = (paymentId, payload) =>
  api.post(`/subscription/payments/${paymentId}/confirm`, payload);

export async function downloadSubscriptionInvoicePdf(paymentId, invoiceNumber) {
  const { data } = await api.get(`/subscription/payments/${paymentId}/pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ApnaMedi_Invoice_${invoiceNumber || paymentId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
