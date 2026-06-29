import api from "./axios";

export const getReferralPartners = (params) => api.get("/diagnostics/referral-partners", { params });

export const getReferralPartnerLedger = (id) => api.get(`/diagnostics/referral-partners/${id}/ledger`);
export const recordReferralPayout = (id, data) => api.post(`/diagnostics/referral-partners/${id}/payouts`, data);

export const createReferralPartner = (data) => api.post("/diagnostics/referral-partners", data);
export const updateReferralPartner = (id, data) => api.put(`/diagnostics/referral-partners/${id}`, data);
export const deleteReferralPartner = (id) => api.delete(`/diagnostics/referral-partners/${id}`);
