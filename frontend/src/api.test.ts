import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { authHeaders, fetchAuthenticated, SESSION_EXPIRED_EVENT } from './api';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'current-token');
  localStorage.setItem('characterId', 'char-1');
});
afterEach(() => vi.unstubAllGlobals());

test('successful authenticated requests preserve the session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));
  await fetchAuthenticated('/api/wanted-ads', { headers: authHeaders() });
  expect(localStorage.getItem('token')).toBe('current-token');
});

test('a rejected session clears stale identity and notifies the login redirect', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 401 }));
  const expired = vi.fn();
  window.addEventListener(SESSION_EXPIRED_EVENT, expired);
  try {
    await fetchAuthenticated('/api/wanted-ads', { headers: authHeaders() });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('characterId')).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
  } finally {
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }
});

test('permission failures do not log out a valid session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 403 }));
  await fetchAuthenticated('/api/wanted-ads', { headers: authHeaders() });
  expect(localStorage.getItem('token')).toBe('current-token');
});

test('a late rejected request cannot clear a newer login session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
    localStorage.setItem('token', 'new-token');
    return { status: 401 };
  }));
  await fetchAuthenticated('/api/wanted-ads', { headers: authHeaders() });
  expect(localStorage.getItem('token')).toBe('new-token');
});
