/**
 * Smart API base URL helper.
 *
 * Behavior:
 *  - On production custom domain (arsayatirimzirvesi.com) → use same-origin /api
 *    so requests are first-party (no CORS, no cookie issues).
 *  - On preview / dev / emergent.host → use REACT_APP_BACKEND_URL as configured.
 *
 * This protects against the platform baking a different REACT_APP_BACKEND_URL
 * into the build than the actual host the user is browsing.
 */
function resolveApiBase() {
  const envUrl = process.env.REACT_APP_BACKEND_URL || "";
  if (typeof window === "undefined") return envUrl + "/api";

  const currentHost = window.location.hostname;

  // Custom production domain (and www variant) — always use same-origin
  if (
    currentHost === "arsayatirimzirvesi.com" ||
    currentHost === "www.arsayatirimzirvesi.com"
  ) {
    return window.location.origin + "/api";
  }

  // If env URL host matches current host, also use same-origin
  try {
    const envHost = new URL(envUrl).hostname;
    if (envHost && envHost === currentHost) {
      return window.location.origin + "/api";
    }
  } catch {
    /* invalid env url, fall through */
  }

  // Otherwise (preview, local) use the configured backend URL
  return (envUrl || window.location.origin) + "/api";
}

export const API_BASE = resolveApiBase();
