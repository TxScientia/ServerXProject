export const THEMES = ['dark', 'parchment'] as const;
export type ThemeName = (typeof THEMES)[number];

const STORAGE_KEY = 'theme';

export function getInitialTheme(): ThemeName {
  if (typeof localStorage === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'parchment' || stored === 'dark' ? stored : 'dark';
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme() {
  applyTheme(getInitialTheme());
}
