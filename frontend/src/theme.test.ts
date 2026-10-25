import { beforeEach, expect, test } from 'vitest';
import { applyTheme, getInitialTheme, initTheme } from './theme';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test('defaults to light mode', () => {
  initTheme();
  expect(getInitialTheme()).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('light');
});

test('preserves a saved dark-mode preference', () => {
  applyTheme('dark');
  initTheme();
  expect(getInitialTheme()).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('switches back to light and persists it', () => {
  applyTheme('dark');
  applyTheme('light');
  expect(getInitialTheme()).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('light');
});

test('maps legacy parchment preferences to light', () => {
  applyTheme('parchment');
  expect(getInitialTheme()).toBe('light');
  expect(document.documentElement.dataset.theme).toBe('light');
});
