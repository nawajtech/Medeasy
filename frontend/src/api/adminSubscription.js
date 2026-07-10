import api from "./axios";

export const getAdminPlans = () => api.get("/admin/plans");
export const getPlanFeatures = () => api.get("/admin/plans/features");
export const getSubscriptionTax = () => api.get("/admin/subscription-tax");
export const updateSubscriptionTax = (payload) => api.put("/admin/subscription-tax", payload);
export const createPlan = (payload) => api.post("/admin/plans", payload);
export const updatePlan = (id, payload) => api.put(`/admin/plans/${id}`, payload);
export const deletePlan = (id) => api.delete(`/admin/plans/${id}`);

export const getAdminSubscriptions = () => api.get("/admin/subscriptions");
export const assignCompanySubscription = (companyId, payload) =>
  api.post(`/admin/companies/${companyId}/subscription`, payload);
export const getAdminPayments = () => api.get("/admin/subscription-payments");
