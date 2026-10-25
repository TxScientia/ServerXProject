import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import AppLayout from './AppLayout';
import usePageWheelScroll from './usePageWheelScroll';
import styles from './AppLayout.module.css';

vi.mock('./usePageWheelScroll', () => ({ default: vi.fn() }));
vi.mock('../../realtime/WebSocketProvider', () => ({ useWebSocket: () => ({ pmUnread: 0 }) }));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(usePageWheelScroll).mockClear();
});

afterEach(() => vi.restoreAllMocks());

test('measures the sticky nav and updates the side panel offset on resize', () => {
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue({ height: 64 } as DOMRect);
  const { container } = render(<AppLayout pageScroll><p>Ads</p></AppLayout>);
  const shell = container.firstElementChild as HTMLElement;
  expect(shell.style.getPropertyValue('--app-topbar-height')).toBe('64px');
  rect.mockReturnValue({ height: 96 } as DOMRect);
  fireEvent(window, new Event('resize'));
  expect(shell.style.getPropertyValue('--app-topbar-height')).toBe('96px');
});

test('opts into content-sized document scrolling without a nested wheel handler', () => {
  const { container } = render(<AppLayout pageScroll scrollCenterFromPage leftNav="Sections"><p>Long ad list</p></AppLayout>);
  expect(container.firstElementChild).toHaveClass(styles.pageScroll);
  expect(screen.getByRole('main')).toHaveTextContent('Long ad list');
  expect(screen.getByRole('navigation', { name: 'Section navigation' })).toHaveTextContent('Sections');
  expect(screen.getByRole('complementary', { name: 'Character details' })).toBeInTheDocument();
  expect(vi.mocked(usePageWheelScroll).mock.calls.at(-1)?.[1]).toBe(false);
});

test('preserves existing panel scrolling on pages that do not opt in', () => {
  const { container } = render(<AppLayout scrollCenterFromPage><p>Scene content</p></AppLayout>);
  expect(container.firstElementChild).not.toHaveClass(styles.pageScroll);
  expect(vi.mocked(usePageWheelScroll).mock.calls.at(-1)?.[1]).toBe(true);
});
