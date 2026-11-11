/**
 * Partner portal: partner.apnamedi.com (or VITE_APP_MODE=partner for local).
 * Legacy patient.* hostnames also load the Partner Portal.
 * Staff dashboard stays on app.apnamedi.com.
 */
export function isPartnerApp() {
  if (import.meta.env.VITE_APP_MODE === "partner") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname.toLowerCase();
  return (
    host === "partner.apnamedi.com" ||
    host.startsWith("partner.") ||
    host === "patient.apnamedi.com" ||
    host.startsWith("patient.")
  );
}
