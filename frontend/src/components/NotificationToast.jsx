import { useNotifications } from "../notifications/NotificationContext";
import "./NotificationToast.css";

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function NotificationToast() {
  const { toast, dismissToast } = useNotifications();

  if (!toast) {
    return null;
  }

  return (
    <div className="notification-toast" role="alert" aria-live="assertive">
      <div className="notification-toast-icon" aria-hidden="true">
        🔔
      </div>
      <div className="notification-toast-content">
        <p className="notification-toast-label">New notification</p>
        <p className="notification-toast-title">{toast.title}</p>
        {toast.body ? <p className="notification-toast-body">{toast.body}</p> : null}
        <p className="notification-toast-time">{formatTime(toast.receivedAt)}</p>
      </div>
      <button
        type="button"
        className="notification-toast-close"
        onClick={dismissToast}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export default NotificationToast;
