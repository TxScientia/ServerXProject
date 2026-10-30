import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import ThemeSwitcher from './index';
import { applyTheme } from '../../theme';

beforeEach(() => {
  localStorage.clear();
  applyTheme('light');
});

afterEach(() => vi.unstubAllGlobals());

test('switches between light and dark', () => {
  render(<ThemeSwitcher />);
  const toggle = screen.getByRole('switch');
  expect(toggle).not.toBeChecked();
  fireEvent.click(toggle);
  expect(toggle).toBeChecked();
  expect(document.documentElement.dataset.theme).toBe('dark');
  fireEvent.click(toggle);
  expect(toggle).not.toBeChecked();
  expect(document.documentElement.dataset.theme).toBe('light');
});

test('persists the selected mode to the account', () => {
  localStorage.setItem('token', 'test-token');
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
  render(<ThemeSwitcher />);
  fireEvent.click(screen.getByRole('switch'));
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/me/preferences'), expect.objectContaining({
    method: 'PATCH',
    body: JSON.stringify({ theme: 'dark' }),
  }));
});
