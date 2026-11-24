import api from "./axios";

export const getSettingsForm = (params) => api.get("/settings/form", { params });
export const uploadSettingImage = (data) => api.post("/settings/upload-image", data);
export const bulkUpdateSettings = (data) => api.put("/settings/bulk", data);

