import { API_BASE_URL } from "../config/env";

/**
 * Turn a stored image path/URL into a browser-loadable URL.
 * - Absolute S3 / CDN URLs are returned as-is
 * - Local /storage paths are rewritten to /api/media for SPA proxies
 */
export function resolveMediaUrl(url) {
  if (!url) return null;
  if (typeof url !== "string") return null;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  // Already absolute (S3, CDN, or full API media URL)
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const apiBase = (API_BASE_URL || "").replace(/\/$/, "");

  try {
    if (url.includes("/api/media/")) {
      return url.startsWith("http") ? url : `${apiBase.replace(/\/api$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
    }

    if (url.includes("/storage/")) {
      const relative = url.split("/storage/")[1];
      if (!relative) return url;
      return `${apiBase}/media/${relative}`;
    }

    if (url.startsWith("/")) {
      return `${apiBase.replace(/\/api$/, "")}${url}`;
    }

    // Relative disk/S3 key e.g. platform/uuid.png
    return `${apiBase}/media/${url.replace(/^\//, "")}`;
  } catch {
    return url;
  }
}
