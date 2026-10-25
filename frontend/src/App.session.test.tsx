import { type ReactNode } from 'react';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./realtime/WebSocketProvider', () => ({
  WebSocketProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useWebSocket: () => ({ pmUnread: 0 }),
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'expired-token');
  localStorage.setItem('characterId', 'char-1');
  window.history.replaceState({}, '', '/gesuche');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

test('a rejected Gesuche session redirects to login with an explanatory message', async () => {
  render(<App />);
  expect(await screen.findByRole('status')).toHaveTextContent(/Sitzung.*erneut an/);
  expect(window.location.pathname).toBe('/');
  expect(window.location.search).toBe('?session=expired');
  expect(localStorage.getItem('token')).toBeNull();
});
