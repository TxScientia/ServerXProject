/**
 * Client mirror of account preferences. The server is the source of truth (see
 * /me and /me/preferences); we cache the values in localStorage so the UI can read
 * them synchronously (no flash), and re-hydrate from the server on login + app load.
 *
 * Theme lives in theme.ts (it needs to apply before first paint). This module covers
 * the unread-badge toggle.
 */
const BADGE_KEY = 'showUnreadBadge';

/** Fired (same-tab) whenever a preference changes, so the nav can update live. */
export const PREFS_EVENT = 'serverx:prefs';

export function getShowUnreadBadge(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(BADGE_KEY) !== '0';
}

export function setShowUnreadBadge(show: boolean): void {
  localStorage.setItem(BADGE_KEY, show ? '1' : '0');
  window.dispatchEvent(new Event(PREFS_EVENT));
}
