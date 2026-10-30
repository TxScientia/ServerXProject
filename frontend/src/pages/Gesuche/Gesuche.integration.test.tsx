import { type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { SESSION_EXPIRED_EVENT } from '../../api';
import GesuchePage from './index';
import frameStyles from '../../assets/styles/ResidentFrame.module.css';
import adStyles from '../../components/WantedAds/WantedAds.module.css';

// Keep the real list, cards, rich-text renderer, composer and editor in these tests.
vi.mock('../../pageLayouts/appLayout/AppLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../pageLayouts/lobbyLayout/LobbyLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Existing ad body' }] }] };
const existingAd = {
  id: 'ad-1', scope_type: 'global', space_id: null, title: 'Existing wanted ad', body,
  author_character_id: 'char-1', author_name: 'Test character', created_at: '2026-10-25T12:00:00',
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'valid-token');
  localStorage.setItem('characterId', 'char-1');
});
afterEach(() => vi.unstubAllGlobals());

test('displays existing ads and creates a new one with the real rich-text form', async () => {
  const ads = [existingAd];
  const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer valid-token', 'X-Character-Id': 'char-1' });
    if (init?.method === 'POST') {
      const payload = JSON.parse(init.body as string);
      const ad = { ...existingAd, ...payload, id: 'ad-2' };
      ads.push(ad);
      return { ok: true, status: 200, json: async () => ad };
    }
    return { ok: true, status: 200, json: async () => [...ads] };
  });
  vi.stubGlobal('fetch', fetchMock);
  const { container } = render(<GesuchePage />);
  expect(await screen.findByText('Existing wanted ad')).toBeInTheDocument();
  expect(screen.getByText('Existing ad body')).toBeInTheDocument();
  const existingCard = screen.getByText('Existing wanted ad').closest('header')?.parentElement;
  expect(existingCard).toHaveClass(frameStyles.frame, adStyles.framedCard);
  expect(existingCard?.querySelector(`.${adStyles.adBorder}`)).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByText('Existing wanted ad').closest('header')).toHaveTextContent('von Test character');
  expect(screen.getByText('Test character')).toHaveClass(adStyles.authorBadge);
  expect(existingCard?.querySelector('time')).toHaveAttribute('dateTime', existingAd.created_at);

  fireEvent.click(screen.getByRole('button', { name: 'GESUCH ERSTELLEN' }));
  fireEvent.change(screen.getByPlaceholderText('Titel'), { target: { value: 'New wanted ad' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Tag 1' }), { target: { value: ' Fantasy ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tag hinzufügen' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Tag 2' }), { target: { value: 'Adventure' } });
  await screen.findByLabelText('Fett');
  const editorDom = container.querySelector('.tiptap') as HTMLElement & { editor: Editor };
  expect(editorDom).not.toBeNull();
  act(() => { editorDom.editor.commands.insertContent('New ad body'); });
  fireEvent.click(screen.getByRole('button', { name: 'Erstellen' }));

  expect(await screen.findByText('New wanted ad')).toBeInTheDocument();
  expect(screen.getByText('New ad body')).toBeInTheDocument();
  expect(screen.getByText('FANTASY, ADVENTURE')).toBeInTheDocument();
  expect(screen.getByText('Existing wanted ad')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'GESUCH ERSTELLEN' })).toBeInTheDocument();
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
  expect(post?.[0]).toBe('/api/wanted-ads');
  expect(JSON.parse(post![1].body as string)).toMatchObject({
    title: 'New wanted ad', body: { type: 'doc' }, tags: ['Fantasy', 'Adventure'],
  });
});

test('tag fields are optional, limited to six, and each accepts at most 50 characters', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }));
  render(<GesuchePage />);
  await screen.findByText('Noch keine Gesuche.');
  fireEvent.click(screen.getByRole('button', { name: 'GESUCH ERSTELLEN' }));
  await screen.findByLabelText('Fett');
  await screen.findByText('Noch keine Gesuche.');
  for (let i = 1; i < 6; i++) fireEvent.click(screen.getByRole('button', { name: 'Tag hinzufügen' }));
  expect(screen.getAllByRole('textbox', { name: /^Tag \d$/ })).toHaveLength(6);
  expect(screen.queryByRole('button', { name: 'Tag hinzufügen' })).not.toBeInTheDocument();
  screen.getAllByRole('textbox', { name: /^Tag \d$/ }).forEach((field) => expect(field).toHaveAttribute('maxlength', '50'));
  fireEvent.click(screen.getByRole('button', { name: 'Tag 6 entfernen' }));
  expect(screen.getAllByRole('textbox', { name: /^Tag \d$/ })).toHaveLength(5);
  expect(screen.getByRole('button', { name: 'Tag hinzufügen' })).toBeInTheDocument();
});

test('expired-session list failures request a fresh login rather than leaving stale credentials', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
  const expired = vi.fn();
  window.addEventListener(SESSION_EXPIRED_EVENT, expired);
  try {
    render(<GesuchePage />);
    await waitFor(() => expect(expired).toHaveBeenCalledOnce());
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('characterId')).toBeNull();
  } finally {
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
  }
});
