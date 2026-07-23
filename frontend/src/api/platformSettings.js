import api from "./axios";

export const getPlatformBranding = () => api.get("/platform-branding");
export const getPlatformSettingsForm = () => api.get("/platform-settings/form");
export const uploadPlatformSettingImage = (payload) =>
  api.post("/platform-settings/upload-image", payload);
export const updatePlatformSettings = (payload) =>
  api.put("/platform-settings", payload);
