import { API_BASE_URL } from "../config/env";

export async function openAuthenticatedDocument(path) {
  const token = localStorage.getItem("medeasy_token");
  if (!token) {
    window.location.href = "/login";
    return;
  }

  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/html",
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("medeasy_token");
    localStorage.removeItem("medeasy_user");
    window.location.href = "/login";
    return;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load document.");
  }

  const html = await response.text();
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const tab = window.open(blobUrl, "_blank");

  if (!tab) {
    URL.revokeObjectURL(blobUrl);
    throw new Error("Pop-up blocked. Please allow pop-ups for this site.");
  }

  setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
}
