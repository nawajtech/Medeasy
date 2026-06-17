/**
 * Read a Vite environment variable (VITE_*), with optional default — like Laravel env().
 */
export function env(key, defaultValue) {
  const value = import.meta.env[key];
  if (value !== undefined && value !== "") {
    return value;
  }
  return defaultValue;
}

export const API_BASE_URL = env("VITE_API_BASE_URL", "http://127.0.0.1:8000/api");
