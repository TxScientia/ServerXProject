import { apiUrl, authHeaders } from './api';

export type LibraryFont = { family: string; cached: boolean };

export async function listFonts(): Promise<LibraryFont[]> {
  const response = await fetch(apiUrl('/fonts'));
  if (!response.ok) throw new Error('Schriftbibliothek konnte nicht geladen werden.');
  return response.json();
}

const pending = new Map<string, Promise<void>>();

/** Shared by editors and profile views. All CSS and font bytes come from our server. */
export function loadFont(family: string): Promise<void> {
  family = family.trim().replace(/\s+/g, ' ');
  if (!family) return Promise.resolve();
  const key = family.toLowerCase();
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    const response = await fetch(apiUrl('/fonts'), {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ family }),
    });
    if (!response.ok) throw new Error('Schrift konnte nicht geladen werden. Bitte Namen prüfen oder später erneut versuchen.');
    const { stylesheet } = await response.json();
    await new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = apiUrl(stylesheet);
      link.onload = () => resolve();
      link.onerror = () => {
        link.remove();
        reject(new Error('Schrift konnte nicht geladen werden.'));
      };
      document.head.appendChild(link);
    });
  })();
  pending.set(key, request);
  request.catch(() => pending.delete(key));
  return request;
}
