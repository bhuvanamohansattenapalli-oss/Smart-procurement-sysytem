/**
 * One configurable base for the separate ProcureFlow REST backend. Keep
 * frontend calls relative by default so local development and deployment share
 * the same origin; set VITE_API_BASE_URL only when hosting the API elsewhere.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
