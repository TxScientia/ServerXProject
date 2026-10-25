export const THEMES = ['light', 'dark'] as const;
export type ThemeName = (typeof THEMES)[number];

const STORAGE_KEY = 'theme';

export function getInitialTheme(): ThemeName {
  if (typeof localStorage === 'undefined') return 'light';
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeName | 'parchment') {
  // Existing parchment preferences use the new light design.
  const resolved = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem(STORAGE_KEY, resolved);
}

export function initTheme() {
  applyTheme(getInitialTheme());
}
