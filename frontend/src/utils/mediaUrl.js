import { API_BASE_URL } from "../config/env";

/**
 * Turn a stored image path/URL into a browser-loadable URL.
 * Live SPA setups usually proxy only /api → Laravel, so /storage/* breaks.
 */
export function resolveMediaUrl(url) {
  if (!url) return null;
  if (typeof url !== "string") return null;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  const apiBase = (API_BASE_URL || "").replace(/\/$/, "");

  try {
    if (url.includes("/api/media/")) {
      return url;
    }

    if (url.includes("/storage/")) {
      const relative = url.split("/storage/")[1];
      if (!relative) return url;
      return `${apiBase}/media/${relative}`;
    }

    if (url.startsWith("/")) {
      return `${apiBase.replace(/\/api$/, "")}${url}`;
    }

    // Relative disk path e.g. platform/uuid.png
    if (!/^https?:\/\//i.test(url)) {
      return `${apiBase}/media/${url.replace(/^\//, "")}`;
    }
  } catch {
    return url;
  }

  return url;
}
