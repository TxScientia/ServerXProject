import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import usePageWheelScroll from './usePageWheelScroll';

let panel: HTMLDivElement;
let outside: HTMLDivElement;

beforeEach(() => {
  panel = document.createElement('div');
  outside = document.createElement('div');
  Object.defineProperties(panel, {
    scrollHeight: { value: 2000, configurable: true },
    clientHeight: { value: 500 },
  });
  document.body.append(panel, outside);
});

afterEach(() => {
  panel.remove();
  outside.remove();
});

function wheel(target: Element, deltaMode = 0, ctrlKey = false) {
  const event = new WheelEvent('wheel', {
    deltaY: 3, deltaMode, ctrlKey, bubbles: true, cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

test('scrolls only the middle panel when wheeling over page surroundings', () => {
  renderHook(() => usePageWheelScroll({ current: panel }, true));
  expect(wheel(outside).defaultPrevented).toBe(true);
  expect(panel.scrollTop).toBe(3);
  expect(outside.scrollTop).toBe(0);
});

test('leaves native scrolling inside the middle panel and dialogs alone', () => {
  renderHook(() => usePageWheelScroll({ current: panel }, true));
  const child = document.createElement('div');
  panel.append(child);
  expect(wheel(child).defaultPrevented).toBe(false);
  outside.setAttribute('role', 'dialog');
  expect(wheel(outside).defaultPrevented).toBe(false);
  expect(panel.scrollTop).toBe(0);
});

test('supports line and page wheel units', () => {
  renderHook(() => usePageWheelScroll({ current: panel }, true));
  wheel(outside, 1);
  expect(panel.scrollTop).toBe(48);
  wheel(outside, 2);
  expect(panel.scrollTop).toBe(1548);
});

test('does not intercept zoom gestures or panels without overflow', () => {
  renderHook(() => usePageWheelScroll({ current: panel }, true));
  expect(wheel(outside, 0, true).defaultPrevented).toBe(false);
  Object.defineProperty(panel, 'scrollHeight', { value: 500 });
  expect(wheel(outside).defaultPrevented).toBe(false);
  expect(panel.scrollTop).toBe(0);
});

test('does not affect other pages and removes its listener on unmount', () => {
  const { rerender, unmount } = renderHook(
    ({ enabled }) => usePageWheelScroll({ current: panel }, enabled),
    { initialProps: { enabled: false } },
  );
  expect(wheel(outside).defaultPrevented).toBe(false);
  rerender({ enabled: true });
  wheel(outside);
  expect(panel.scrollTop).toBe(3);
  unmount();
  expect(wheel(outside).defaultPrevented).toBe(false);
  expect(panel.scrollTop).toBe(3);
});
