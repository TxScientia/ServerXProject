const STORAGE_KEY = 'accentHue';

export function normalizeAccentHue(value: number): number {
  return Number.isFinite(value) ? Math.min(360, Math.max(0, value)) : 0;
}

/** The custom hue is a browser-local preference, independent of account theme. */
export function getAccentHue(): number {
  return normalizeAccentHue(Number(localStorage.getItem(STORAGE_KEY) ?? 0));
}

export function applyAccentHue(value: number): void {
  const hue = normalizeAccentHue(value);
  document.documentElement.style.setProperty('--accent-hue', String(hue));
  localStorage.setItem(STORAGE_KEY, String(hue));
}
