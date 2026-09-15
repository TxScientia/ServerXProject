const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
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
