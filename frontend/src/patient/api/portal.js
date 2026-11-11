import partnerApi from "./axios";

export const partnerSendOtp = (payload) => partnerApi.post("/partner/auth/otp/send", payload);
export const partnerVerifyOtp = (payload) => partnerApi.post("/partner/auth/otp/verify", payload);
export const partnerRegister = (payload) => partnerApi.post("/partner/auth/register", payload);
export const partnerLogin = (payload) => partnerApi.post("/partner/auth/login", payload);
export const partnerMe = () => partnerApi.get("/partner/auth/me");
export const partnerLogout = () => partnerApi.post("/partner/auth/logout");
export const partnerUpdateProfile = (payload) => partnerApi.put("/partner/auth/profile", payload);
export const partnerChangePassword = (payload) => partnerApi.put("/partner/auth/password", payload);
export const partnerForgotPassword = (payload) => partnerApi.post("/partner/auth/forgot-password", payload);
export const partnerResetPassword = (payload) =>
  partnerApi.post("/partner/auth/forgot-password/reset", payload);

export const getPartnerDashboard = () => partnerApi.get("/partner/dashboard");
export const listCentres = (params) => partnerApi.get("/partner/centres", { params });
export const getCentre = (id) => partnerApi.get(`/partner/centres/${id}`);
export const getCentreServices = (id) => partnerApi.get(`/partner/centres/${id}/services`);
export const getCentreSlots = (id, params) => partnerApi.get(`/partner/centres/${id}/slots`, { params });

export const listPartnershipRequests = (params) => partnerApi.get("/partner/requests", { params });
export const requestPartnership = (payload) => partnerApi.post("/partner/requests", payload);
export const listRelationships = () => partnerApi.get("/partner/relationships");

export const bookReferral = (payload) => partnerApi.post("/partner/bookings", payload);
export const listReferrals = (params) => partnerApi.get("/partner/referrals", { params });
export const getReferral = (id) => partnerApi.get(`/partner/referrals/${id}`);
export const getEarnings = () => partnerApi.get("/partner/earnings");
