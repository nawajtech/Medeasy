import api from "./axios";

export const getTaxSettings = (params) => api.get("/tax/settings", { params });
