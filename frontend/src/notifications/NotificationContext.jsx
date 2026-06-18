import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  clearAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { initFirebaseMessaging, resetFirebaseMessagingInit } from "../firebase";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, user, loading: authLoading, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [pushStatus, setPushStatus] = useState("idle");
  const [pushError, setPushError] = useState("");

  const loadNotifications = useCallback(async () => {
    const { data } = await fetchNotifications();
    setNotifications(data);
    return data;
  }, []);

  const handleIncoming = useCallback((payload) => {
    const title = payload.notification?.title ?? "MedEasy";
    const body = payload.notification?.body ?? "";
    const item = {
      id: payload.data?.notification_id ?? crypto.randomUUID(),
      title,
      body,
      data: payload.data ?? {},
      read: false,
      receivedAt: new Date().toISOString(),
    };

    setNotifications((prev) => [item, ...prev.filter((n) => n.id !== item.id)].slice(0, 50));
    setToast(item);

    if (Notification.permission === "granted") {
      new Notification(title, { body, data: payload.data });
    }

    loadNotifications().catch(() => {});
  }, [loadNotifications]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user || !token) {
      setNotifications([]);
      return undefined;
    }

    loadNotifications().catch((error) => {
      console.error("[Notifications] Failed to load:", error);
    });

    let cancelled = false;

    setPushStatus("registering");
    setPushError("");

    initFirebaseMessaging(handleIncoming, user.id)
      .then(() => {
        if (!cancelled) {
          setPushStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPushStatus("error");
          setPushError(error?.response?.data?.message ?? error?.message ?? "Unable to enable notifications.");
          console.error("[FCM] Registration failed:", error);
        }
      });

    return () => {
      cancelled = true;
      resetFirebaseMessagingInit();
    };
  }, [authLoading, isAuthenticated, user?.id, token, handleIncoming, loadNotifications]);

  const enablePushNotifications = useCallback(async () => {
    if (!user) {
      return;
    }

    setPushStatus("registering");
    setPushError("");

    try {
      await initFirebaseMessaging(handleIncoming, user.id);
      setPushStatus("ready");
    } catch (error) {
      setPushStatus("error");
      setPushError(error?.response?.data?.message ?? error?.message ?? "Unable to enable notifications.");
      console.error("[FCM] Registration failed:", error);
      throw error;
    }
  }, [handleIncoming, user]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error("[Notifications] Failed to mark as read:", error);
      await loadNotifications();
    }
  }, [loadNotifications]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error("[Notifications] Failed to mark all as read:", error);
      await loadNotifications();
    }
  }, [loadNotifications]);

  const removeNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await deleteNotification(id);
    } catch (error) {
      console.error("[Notifications] Failed to delete:", error);
      await loadNotifications();
    }
  }, [loadNotifications]);

  const clearAll = useCallback(async () => {
    setNotifications([]);

    try {
      await clearAllNotifications();
    } catch (error) {
      console.error("[Notifications] Failed to clear all:", error);
      await loadNotifications();
    }
  }, [loadNotifications]);

  const dismissToast = useCallback(() => setToast(null), []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      toast,
      pushStatus,
      pushError,
      enablePushNotifications,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
      dismissToast,
      refreshNotifications: loadNotifications,
    }),
    [notifications, unreadCount, toast, pushStatus, pushError, enablePushNotifications, markAsRead, markAllAsRead, removeNotification, clearAll, dismissToast, loadNotifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
