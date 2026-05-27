import api from "./axios";

export const getDashboard = (params) => api.get("/dashboard", { params });
