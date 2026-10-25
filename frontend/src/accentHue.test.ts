import { beforeEach, expect, test } from 'vitest';
import { applyAccentHue, getAccentHue } from './accentHue';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty('--accent-hue');
});

test('defaults to the original burgundy hue', () => {
  expect(getAccentHue()).toBe(0);
});

test('applies the hue immediately and persists across reloads', () => {
  applyAccentHue(210);
  expect(document.documentElement.style.getPropertyValue('--accent-hue')).toBe('210');
  expect(getAccentHue()).toBe(210);
});

test('clamps invalid and out-of-range preferences', () => {
  applyAccentHue(999);
  expect(getAccentHue()).toBe(360);
  applyAccentHue(-10);
  expect(getAccentHue()).toBe(0);
  localStorage.setItem('accentHue', 'invalid');
  expect(getAccentHue()).toBe(0);
});
