import { apiUrl, authHeaders } from './api';

const IMAGE_PATH = /^\/api\/images\/[a-f0-9]{32}\.webp$/;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Never pass user-provided image URLs directly to a browser resource attribute. */
export function imageSrc(value?: string | null): string | undefined {
  return value && IMAGE_PATH.test(value) ? apiUrl(value.slice(4)) : undefined;
}

function imageId(value?: string | null): string | undefined {
  return value && IMAGE_PATH.test(value) ? value.slice('/api/images/'.length, -'.webp'.length) : undefined;
}

export async function deleteImage(value?: string | null, signal?: AbortSignal): Promise<void> {
  const id = imageId(value);
  if (!id) return; // Legacy external references have no local file to delete.
  const response = await fetch(apiUrl(`/images/${id}`), {
    method: 'DELETE', headers: authHeaders(), signal,
  });
  if (!response.ok && response.status !== 404) throw new Error('Bild konnte nicht gelöscht werden.');
}

export async function uploadImage(file: File, signal?: AbortSignal, previous?: string | null): Promise<string> {
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error('Dateigröße: maximal 10 MiB.');
  const replacedId = imageId(previous);
  const endpoint = replacedId ? `/images?replace=${replacedId}` : '/images';
  const response = await fetch(apiUrl(endpoint), {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/octet-stream' },
    body: file, signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : 'Bild konnte nicht hochgeladen werden.');
  }
  const result = await response.json();
  if (!imageSrc(result.url)) throw new Error('Ungültige Bildantwort.');
  return result.url;
}
