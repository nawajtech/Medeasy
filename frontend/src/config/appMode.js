/**
 * Patient portal runs on patient.apnamedi.com (or VITE_APP_MODE=patient for local).
 * Staff dashboard stays on app.apnamedi.com.
 */
export function isPatientApp() {
  if (import.meta.env.VITE_APP_MODE === "patient") {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname.toLowerCase();
  return host === "patient.apnamedi.com" || host.startsWith("patient.");
}
