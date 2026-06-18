import api from "./axios";

export function fetchNotifications() {
  return api.get("/notifications");
}

export function markNotificationRead(id) {
  return api.patch(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return api.post("/notifications/read-all");
}

export function deleteNotification(id) {
  return api.delete(`/notifications/${id}`);
}

export function clearAllNotifications() {
  return api.delete("/notifications");
}

export function registerFcmToken(token) {
  return api.post("/notifications/token", {
    token,
    device_name: navigator.userAgent.slice(0, 255),
  });
}

export function removeFcmToken(token) {
  return api.delete("/notifications/token", {
    data: { token },
  });
}

export function sendTestNotification() {
  return api.post("/notifications/test");
}
