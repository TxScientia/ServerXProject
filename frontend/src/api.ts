const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
// All backend routes live under /api (so SPA page routes like /residents don't collide
// with API routes). Centralised here so callers keep passing bare paths like '/residents'.
const API_PREFIX = '/api';

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${API_PREFIX}${normalizedPath}`;
}

/** WebSocket URL for the given path, deriving ws/wss from the API base or the page origin. */
export function wsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // API_BASE may be '', an absolute URL, or a relative path (proxied deploys). Resolving
  // against the page origin as the base handles all three: an absolute API_BASE ignores
  // the base, a relative/empty one is resolved against the origin.
  const url = new URL(`${API_BASE}${API_PREFIX}${normalizedPath}`, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

/** Fired (same-tab) whenever the login token changes, so the WebSocket provider can
 * (re)connect or disconnect. Cross-tab changes come through the native 'storage' event. */
export const AUTH_EVENT = 'serverx:auth';

/** Store the login token and notify listeners (used on login). */
export function setAuthToken(token: string): void {
  localStorage.setItem('token', token);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/** Clear the login token and notify listeners (used on logout). */
export function clearAuthToken(): void {
  localStorage.removeItem('token');
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/** Authorization header from the stored login token (empty if not logged in). */
export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** X-Character-Id header for the currently selected character (empty if none). */
export function characterHeaders(): Record<string, string> {
  const characterId = localStorage.getItem('characterId');
  return characterId ? { 'X-Character-Id': characterId } : {};
}
