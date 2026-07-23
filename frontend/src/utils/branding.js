const DEFAULT_FAVICON = "/favicon.svg";
const DEFAULT_BRAND_NAME = "ApnaMedi";
const DEFAULT_TAGLINE = "Healthcare SaaS";
const FAVICON_LINK_ID = "app-dynamic-favicon";

export function getBranding(user) {
  const branding = user?.branding;
  return {
    name: branding?.name || user?.company?.name || DEFAULT_BRAND_NAME,
    logo: branding?.logo || user?.company?.logo_url || null,
    favicon: branding?.favicon || branding?.logo || user?.company?.logo_url || null,
    tagline: branding?.tagline || DEFAULT_TAGLINE,
  };
}

export function applyDocumentBranding(branding) {
  const name = branding?.name || DEFAULT_BRAND_NAME;
  const faviconHref = branding?.favicon || DEFAULT_FAVICON;

  if (typeof document === "undefined") return;

  document.title = name;

  let link = document.getElementById(FAVICON_LINK_ID);
  if (!link) {
    link = document.querySelector("link[rel='icon']");
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.id = FAVICON_LINK_ID;
  const separator = faviconHref.includes("?") ? "&" : "?";
  link.href = faviconHref === DEFAULT_FAVICON
    ? DEFAULT_FAVICON
    : `${faviconHref}${separator}v=${Date.now()}`;
}

export function resetDocumentBranding() {
  applyDocumentBranding({ name: DEFAULT_BRAND_NAME, favicon: DEFAULT_FAVICON });
}
