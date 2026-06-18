/**
 * Read a Vite environment variable (VITE_*), with optional default.
 * Vite injects these at build time from .env / .env.production.
 */
export function env(key, defaultValue) {
  const value = import.meta.env[key];
  if (value !== undefined && value !== "") {
    return value;
  }
  return defaultValue;
}

function resolveApiBaseUrl() {
  const configured = env("VITE_API_BASE_URL", "");
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  // If built without VITE_API_BASE_URL, use same host in the browser (live deploy).
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${origin}/api`;
    }
  }

  return "http://127.0.0.1:8000/api";
}

export const API_BASE_URL = resolveApiBaseUrl();
