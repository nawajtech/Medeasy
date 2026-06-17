import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useNotifications } from "../notifications/NotificationContext";
import "./Header.css";
import "./NotificationToast.css";
import { IconSearch, IconBell, IconChevronRight } from "./icons";
import { getRouteMeta } from "../routeConfig";

function formatTime(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Header() {
  const { pathname } = useLocation();
  const meta = getRouteMeta(pathname);
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    pushStatus,
    pushError,
    enablePushNotifications,
    refreshNotifications,
  } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const panelRef = useRef(null);
  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";

  useEffect(() => {
    if (!panelOpen) {
      return undefined;
    }

    setLoadingList(true);
    refreshNotifications()
      .catch((error) => console.error("[Notifications] Failed to refresh:", error))
      .finally(() => setLoadingList(false));
  }, [panelOpen, refreshNotifications]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setPanelOpen(false);
      }
    }

    if (panelOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  return (
    <header className="top-header">
      <div className="header-left">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span>MedEasy</span>
          <IconChevronRight />
          <span className="breadcrumb-current">{meta.breadcrumb}</span>
        </nav>
        <div className="header-greeting">
          <h1>{meta.title}</h1>
          <p>
            {pathname === "/" ? (
              <>
                Welcome back, <strong>{user?.name || "User"}</strong> — here&apos;s your clinic overview.
              </>
            ) : (
              meta.description
            )}
          </p>
        </div>
      </div>

      <div className="header-right">
        <label className="search-field">
          <span className="search-icon">
            <IconSearch />
          </span>
          <input type="search" placeholder="Search patients, doctors..." aria-label="Search" />
          <kbd className="search-shortcut" aria-hidden="true">
            /
          </kbd>
        </label>

        <div className="notification-btn-wrap" ref={panelRef}>
          <button
            type="button"
            className="icon-btn notification-btn"
            aria-label="Notifications"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
          >
            <IconBell />
            {unreadCount > 0 ? (
              <span className="notification-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
          </button>

          {panelOpen ? (
            <div className="notification-panel">
              <div className="notification-panel-header">
                <div>
                  <h2>Notifications</h2>
                  {unreadCount > 0 ? (
                    <p className="notification-panel-subtitle">{unreadCount} unread</p>
                  ) : null}
                </div>
                <div className="notification-panel-actions">
                  {notifications.length > 0 && unreadCount > 0 ? (
                    <button type="button" onClick={markAllAsRead}>
                      Mark all read
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="notification-panel-list">
                {loadingList ? (
                  <p className="notification-panel-empty">Loading notifications…</p>
                ) : notifications.length === 0 ? (
                  <div className="notification-panel-empty-state">
                    <span className="notification-empty-icon" aria-hidden="true">
                      🔔
                    </span>
                    <p className="notification-panel-empty-title">No notifications yet</p>
                    <p className="notification-panel-empty">
                      {user?.role === "doctor"
                        ? "New appointments will appear here."
                        : "Notifications for your account will appear here."}
                    </p>
                    {pushStatus === "error" ? (
                      <div className="notification-panel-status error">
                        <p>{pushError}</p>
                        <button type="button" onClick={() => enablePushNotifications()}>
                          Enable push alerts
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`notification-item${item.read ? "" : " unread"}`}
                      onClick={() => markAsRead(item.id)}
                    >
                      <div className="notification-item-top">
                        {!item.read ? <span className="notification-unread-dot" aria-hidden="true" /> : null}
                        <p className="notification-item-title">{item.title}</p>
                      </div>
                      {item.body ? <p className="notification-item-body">{item.body}</p> : null}
                      <p className="notification-item-time">{formatTime(item.receivedAt)}</p>
                    </button>
                  ))
                )}
              </div>

              {notifications.length > 0 && pushStatus === "ready" ? (
                <p className="notification-panel-footer">Push alerts enabled on this device</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="header-divider" aria-hidden="true" />

        <button type="button" className="profile" onClick={() => logout()} aria-label="Sign out">
          <span className="profile-avatar">{initial}</span>
          <span className="profile-meta">
            <span className="profile-name">{user?.name}</span>
            <span className="profile-role">{user?.role?.replace("_", " ")}</span>
          </span>
        </button>
      </div>
    </header>
  );
}

export default Header;
