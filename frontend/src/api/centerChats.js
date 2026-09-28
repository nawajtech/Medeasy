import api from "./axios";

export const listStaffCenterChats = () => api.get("/diagnostics/center-chats");
export const getStaffCenterChatUnread = () => api.get("/diagnostics/center-chats/unread");
export const getStaffCenterChat = (id, params) => api.get(`/diagnostics/center-chats/${id}`, { params });
export const sendStaffCenterChatMessage = (id, payload) => {
  if (payload instanceof FormData) {
    return api.post(`/diagnostics/center-chats/${id}/messages`, payload);
  }
  return api.post(`/diagnostics/center-chats/${id}/messages`, payload);
};
