import api from "./axios";

export const getSettings = () => api.get("/settings");
export const getSetting = (id) => api.get(`/settings/${id}`);
export const createSetting = (data) => api.post("/settings", data);
export const updateSetting = (id, data) => api.put(`/settings/${id}`, data);
export const deleteSetting = (id) => api.delete(`/settings/${id}`);
