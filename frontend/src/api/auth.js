import api from "./axios";

export const login = (credentials) => api.post("/auth/login", credentials);
export const logout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me");
export const updateProfile = (payload) => api.put("/auth/profile", payload);
export const changePassword = (payload) => api.put("/auth/password", payload);
export const requestPasswordOtp = (email) => api.post("/auth/forgot-password", { email });
export const verifyPasswordOtp = (payload) => api.post("/auth/forgot-password/verify", payload);
export const resetForgottenPassword = (payload) => api.post("/auth/forgot-password/reset", payload);
