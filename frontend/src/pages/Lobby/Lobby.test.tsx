import type { ReactNode } from 'react';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '../../test-utils';
import Lobby from './index';

vi.mock('../../pageLayouts/lobbyLayout/LobbyLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const initial = [
  { id: 'char-1', name: 'Arthas', race: 'Mensch', spec: 'Paladin', gender: 'Männlich', isFavorite: false },
  { id: 'char-2', name: 'Jaina', race: 'Mensch', spec: 'Magier', gender: 'Weiblich', isFavorite: true },
];
let characters = initial.map((item) => ({ ...item }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
  characters = initial.map((item) => ({ ...item }));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      const id = url.split('/').at(-2);
      const favorite = JSON.parse(init.body as string).is_favorite;
      characters = characters.map((item) => item.id === id ? { ...item, isFavorite: favorite } : item);
      return { ok: true, status: 200, json: async () => ({ id, isFavorite: favorite }) };
    }
    if (init?.method === 'DELETE') {
      characters = characters.filter((item) => !url.endsWith(item.id));
      return { ok: true, status: 200, json: async () => ({ deleted: true }) };
    }
    return { ok: true, status: 200, json: async () => characters.map((item) => ({ ...item })) };
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderLobby() {
  render(<Lobby />);
  await screen.findByRole('button', { name: 'Arthas favorisieren' });
  return screen.getAllByRole('table');
}

test('only favorite characters appear in the favorites table', async () => {
  const [favorites, all] = await renderLobby();
  expect(within(favorites).queryByText('Arthas')).not.toBeInTheDocument();
  expect(within(favorites).getByText('Jaina')).toBeInTheDocument();
  expect(within(all).getByText('Arthas')).toBeInTheDocument();
  expect(within(all).getByText('Jaina')).toBeInTheDocument();
});

test('favoriting and unfavoriting update both tables and persist to the API', async () => {
  const [favorites, all] = await renderLobby();
  fireEvent.click(within(all).getByRole('button', { name: 'Arthas favorisieren' }));
  expect(await within(favorites).findByText('Arthas')).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('/api/characters/char-1/favorite', expect.objectContaining({
    method: 'PATCH', body: JSON.stringify({ is_favorite: true }),
  }));
  fireEvent.click(within(favorites).getByRole('button', { name: 'Arthas aus Favoriten entfernen' }));
  await waitFor(() => expect(within(favorites).queryByText('Arthas')).not.toBeInTheDocument());
  expect(within(all).getByRole('button', { name: 'Arthas favorisieren' })).toHaveAttribute('aria-pressed', 'false');
});

test('cancelling deletion does not call the delete API', async () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  const [, all] = await renderLobby();
  fireEvent.click(within(all).getByRole('button', { name: 'Jaina löschen' }));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Jaina'));
  expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  expect(within(all).getByText('Jaina')).toBeInTheDocument();
});

test('confirmed deletion removes the character from both tables and clears stale selection', async () => {
  localStorage.setItem('characterId', 'char-2');
  localStorage.setItem('characterName', 'Jaina');
  const [favorites, all] = await renderLobby();
  fireEvent.click(within(all).getByRole('button', { name: 'Jaina löschen' }));
  await waitFor(() => expect(within(all).queryByText('Jaina')).not.toBeInTheDocument());
  expect(within(favorites).queryByText('Jaina')).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith('/api/characters/char-2', expect.objectContaining({ method: 'DELETE' }));
  expect(localStorage.getItem('characterId')).toBeNull();
  expect(localStorage.getItem('characterName')).toBeNull();
});

test('failed deletion keeps the character and explains plot ownership protection', async () => {
  const [, all] = await renderLobby();
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 409 } as Response);
  fireEvent.click(within(all).getByRole('button', { name: 'Jaina löschen' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Dieser Charakter besitzt noch einen Plot');
  expect(within(all).getByText('Jaina')).toBeInTheDocument();
});
