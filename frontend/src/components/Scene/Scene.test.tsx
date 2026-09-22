import { render, screen } from '../../test-utils';
import Scene from './index';
import type { SceneRead, SceneWithPosts } from './types';

const body = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

function mockFetch(routes: (url: string, method: string) => unknown) {
  global.fetch = vi.fn((url: RequestInfo | URL, opts?: RequestInit) =>
    Promise.resolve({
      ok: true,
      json: async () => routes(String(url), opts?.method ?? 'GET'),
    }),
  ) as unknown as typeof fetch;
}

beforeEach(() => {
  localStorage.setItem('token', 't');
  localStorage.setItem('characterId', 'c1');
});

test('shows the start-scene form when no active scene exists', async () => {
  mockFetch((url) => {
    if (url.endsWith('/places/p1/scenes')) return [] as SceneRead[];
    return {};
  });

  render(<Scene storybookId="sb1" placeId="p1" />);

  expect(await screen.findByText('An diesem Ort läuft gerade keine Szene.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Szene starten' })).toBeInTheDocument();
});

test('renders the active scene thread with posts and a reply box', async () => {
  const summary: SceneRead = {
    id: 's1',
    place_id: 'p1',
    title: 'The Tavern',
    status: 'active',
    last_post_at: '2026-01-01T00:00:00Z',
    finished_at: null,
    created_at: '2026-01-01T00:00:00Z',
    participant_ids: ['c1'],
    post_count: 1,
  };
  const detail: SceneWithPosts = {
    ...summary,
    posts: [
      {
        id: 'post1',
        author_character_id: 'c1',
        author_name: 'Arthas',
        body: body('The tavern was quiet.'),
        created_at: '2026-01-01T00:00:00Z',
        edited_at: null,
      },
    ],
  };

  mockFetch((url) => {
    if (url.endsWith('/places/p1/scenes')) return [summary];
    if (url.endsWith('/scenes/s1')) return detail;
    return {};
  });

  render(<Scene storybookId="sb1" placeId="p1" />);

  expect(await screen.findByText('The Tavern')).toBeInTheDocument();
  expect(screen.getByText('Arthas')).toBeInTheDocument();
  expect(screen.getByText('The tavern was quiet.')).toBeInTheDocument();
  expect(screen.getByText('Teilnehmer: 1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Antworten' })).toBeInTheDocument();
});
