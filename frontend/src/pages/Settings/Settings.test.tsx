import { type ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import SettingsPage from './index';

vi.mock('../../pageLayouts/lobbyLayout/LobbyLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ theme: 'light', show_unread_badge: true }),
  }));
});

afterEach(() => vi.unstubAllGlobals());

test('renders both settings toggles as accessible switches', async () => {
  render(<SettingsPage />);
  const switches = await screen.findAllByRole('switch');
  expect(switches).toHaveLength(2);
  const notificationSwitch = switches.find((item) => (item as HTMLInputElement).checked)!;
  fireEvent.click(notificationSwitch);
  expect(notificationSwitch).not.toBeChecked();
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/me/preferences'), expect.objectContaining({
    body: JSON.stringify({ show_unread_badge: false }),
  }));
});

test('hue slider applies and saves accent color immediately', async () => {
  render(<SettingsPage />);
  const slider = await screen.findByRole('slider');
  fireEvent.change(slider, { target: { value: '180' } });
  await waitFor(() => expect(document.documentElement.style.getPropertyValue('--accent-hue')).toBe('180'));
  expect(localStorage.getItem('accentHue')).toBe('180');
});
