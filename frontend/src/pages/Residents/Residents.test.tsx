import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import Residents from './index';
import en from '../../locales/en.json';
import de from '../../locales/de.json';

vi.mock('../../pageLayouts/appLayout/AppLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

beforeEach(() => {
  localStorage.setItem('token', 'test');
  localStorage.setItem('characterId', 'character');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

test('residents uses the shared heading with the uppercase Guest quote in both languages', async () => {
  const quote = '“THAT STRANGERS ARE FRIENDS THAT WE SOME DAY MAY MEET.” — EDGAR A. GUEST';
  expect(en.residents.allNote).toBe(quote);
  expect(de.residents.allNote).toBe(quote);
  render(<Residents />);
  const heading = screen.getByRole('heading', { name: 'RESIDENTS', level: 1 });
  expect(heading.nextElementSibling).toHaveTextContent(quote);
  expect(heading.parentElement?.className).toContain('heading');
  const table = await screen.findByRole('table');
  expect(table).toBeInTheDocument();
  expect(table.parentElement?.className).toContain('residentsList');
});
