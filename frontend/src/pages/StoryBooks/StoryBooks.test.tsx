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

test('renders storybooks from the API and the acting character', async () => {
  (global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => [
      {
        id: '1',
        title: 'Neverwhere',
        description: 'A world below',
        owner_character_id: 'char-1',
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
  });

  render(<StoryBooks />);

  expect(await screen.findByText('Neverwhere')).toBeInTheDocument();
  // Acting character shown in the always-present character sidebar
  expect(screen.getByText('Arthas')).toBeInTheDocument();
});

test('shows an empty state when there are no storybooks', async () => {
  (global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => [],
  });

  render(<StoryBooks />);

  expect(await screen.findByText(/Noch keine StoryBooks/)).toBeInTheDocument();
});
