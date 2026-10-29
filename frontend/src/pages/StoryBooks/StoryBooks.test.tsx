import { fireEvent, render, screen, within } from '../../test-utils';
import StoryBooks from './index';
import usePageWheelScroll from '../../pageLayouts/appLayout/usePageWheelScroll';
import layoutStyles from '../../pageLayouts/appLayout/AppLayout.module.css';

vi.mock('../../pageLayouts/appLayout/usePageWheelScroll', () => ({ default: vi.fn() }));

beforeEach(() => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('characterId', 'char-1');
  localStorage.setItem('characterName', 'Arthas');
  global.fetch = vi.fn();
  vi.mocked(usePageWheelScroll).mockClear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

/** URL-aware fetch mock: the StoryBooks list for /storybooks, the tag pool for
 * /tags, empty for the sidebar's /me/plots + /me/favorites and unread counts. */
function mockFetch(storybooks: unknown[], tags: string[] = []) {
  (global.fetch as any).mockImplementation((url: string) =>
    Promise.resolve({
      ok: true,
      json: async () => {
        if (url.includes('/storybooks')) return storybooks;
        if (url.includes('/tags')) return tags.map((name) => ({ name }));
        return [];
      },
    }),
  );
}

function plot(id: string, title: string, creator: string, tags: string[]) {
  return {
    id,
    title,
    description: null,
    image_url: null,
    visibility: 'public',
    owner_character_id: 'owner-' + id,
    owner_character_name: creator,
    member_count: 1,
    tags,
    created_at: '2026-01-01T00:00:00Z',
  };
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

  expect(await screen.findByRole('heading', { name: 'Neverwhere' })).toBeInTheDocument();
  expect(screen.getAllByText('Neverwhere')).toHaveLength(1);
  expect(screen.getByText('Storybook N° 001')).toBeInTheDocument();
  expect(screen.getByText('Erstellt von Richard Mayhew')).toBeInTheDocument();
  expect(screen.getByText('Urban Fantasy')).toBeInTheDocument();
  expect(screen.getByText('A world below')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Zum Storybook: Neverwhere' })).toHaveAttribute('href', '/storybooks/1');
  // Acting character shown in the always-present character sidebar
  expect(screen.getByText('Arthas')).toBeInTheDocument();
});

test('keeps the page shell fixed and routes page wheel scrolling to the main panel', async () => {
  mockFetch([]);

  const { container } = render(<StoryBooks />);

  await screen.findByText(/Noch keine StoryBooks/);
  expect(container.firstElementChild).not.toHaveClass(layoutStyles.pageScroll);
  const [targetRef, enabled] = vi.mocked(usePageWheelScroll).mock.calls.at(-1)!;
  expect(enabled).toBe(true);
  expect(targetRef.current).toBe(screen.getByRole('main'));
  expect(screen.getByRole('main')).toHaveClass(layoutStyles.hideCenterScrollbar, layoutStyles.growingCenter);
  expect(screen.getByRole('main').firstElementChild).toHaveClass(layoutStyles.centerFrame);
});

test('places the create action below the heading and opens the plot form', async () => {
  mockFetch([]);
  render(<StoryBooks />);
  await screen.findByText(/Noch keine StoryBooks/);

  const header = screen.getByRole('heading', { name: 'Storybooks' }).closest('header')!;
  const button = within(header).getByRole('button', { name: 'PLOT ERSTELLEN' });
  expect(screen.getAllByRole('button', { name: 'PLOT ERSTELLEN' })).toHaveLength(1);
  fireEvent.click(button);
  expect(screen.getByRole('heading', { name: 'Neuen Plot erstellen' })).toBeInTheDocument();
  expect(screen.getByLabelText('Titel')).toBeInTheDocument();
});

test('shows an empty state when there are no storybooks', async () => {
  mockFetch([]);

  render(<StoryBooks />);

  expect(await screen.findByText(/Noch keine StoryBooks/)).toBeInTheDocument();
});

test('search matches both title and creator', async () => {
  mockFetch([
    plot('1', 'Neverwhere', 'Richard', ['Urban Fantasy']),
    plot('2', 'Dune', 'Paul', ['Sci-Fi']),
  ]);

  render(<StoryBooks />);
  expect(await screen.findByText('Neverwhere')).toBeInTheDocument();
  expect(screen.getByText('Dune')).toBeInTheDocument();

  const box = screen.getByPlaceholderText('Titel oder Ersteller');

  // Matches by title.
  fireEvent.change(box, { target: { value: 'dune' } });
  expect(screen.queryByText('Neverwhere')).not.toBeInTheDocument();
  expect(screen.getByText('Dune')).toBeInTheDocument();

  // Matches by creator.
  fireEvent.change(box, { target: { value: 'richard' } });
  expect(screen.getByText('Neverwhere')).toBeInTheDocument();
  expect(screen.queryByText('Dune')).not.toBeInTheDocument();
});

test('filters the list by selecting a tag chip', async () => {
  mockFetch(
    [
      plot('1', 'Neverwhere', 'Richard', ['Urban Fantasy']),
      plot('2', 'Dune', 'Paul', ['Sci-Fi']),
    ],
    ['Urban Fantasy', 'Sci-Fi'],
  );

  render(<StoryBooks />);
  expect(await screen.findByText('Dune')).toBeInTheDocument();

  // The tag chip lives in the sidebar; clicking it narrows to Sci-Fi plots.
  fireEvent.click(screen.getByRole('button', { name: 'Sci-Fi' }));

  expect(screen.queryByText('Neverwhere')).not.toBeInTheDocument();
  expect(screen.getByText('Dune')).toBeInTheDocument();

  // Clearing filters restores the full list.
  fireEvent.click(screen.getByText('Filter zurücksetzen'));
  expect(screen.getByText('Neverwhere')).toBeInTheDocument();
});
