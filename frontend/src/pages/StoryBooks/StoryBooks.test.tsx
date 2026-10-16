import { render, screen } from '../../test-utils';
import StoryBooks from './index';

beforeEach(() => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('characterId', 'char-1');
  localStorage.setItem('characterName', 'Arthas');
  global.fetch = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

/** URL-aware fetch mock: the StoryBooks list for /storybooks, empty for the
 * sidebar's /me/plots + /me/favorites and the nav's unread counts. */
function mockFetch(storybooks: unknown[]) {
  (global.fetch as any).mockImplementation((url: string) =>
    Promise.resolve({
      ok: true,
      json: async () => (url.includes('/storybooks') ? storybooks : []),
    }),
  );
}

test('renders storybooks from the API and the acting character', async () => {
  mockFetch([
    {
      id: '1',
      title: 'Neverwhere',
      description: 'A world below',
      image_url: null,
      visibility: 'public',
      owner_character_id: 'char-1',
      owner_character_name: 'Richard Mayhew',
      member_count: 2,
      tags: ['Urban Fantasy'],
      created_at: '2026-01-01T00:00:00Z',
    },
  ]);

  render(<StoryBooks />);

  expect(await screen.findByText('Neverwhere')).toBeInTheDocument();
  // Acting character shown in the always-present character sidebar
  expect(screen.getByText('Arthas')).toBeInTheDocument();
});

test('shows an empty state when there are no storybooks', async () => {
  mockFetch([]);

  render(<StoryBooks />);

  expect(await screen.findByText(/Noch keine StoryBooks/)).toBeInTheDocument();
});
