import { render, screen, fireEvent } from '../../test-utils';
import GuideBook from './index';
import { FAQ, RULES } from './content';

beforeEach(() => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('characterId', 'char-1');
  localStorage.setItem('characterName', 'Arthas');
  // URL-aware mock: empty lists everywhere, zero unread count.
  global.fetch = vi.fn().mockImplementation((url: string) =>
    Promise.resolve({
      ok: true,
      json: async () => (url.includes('/unread-count') ? { count: 0 } : []),
    }),
  );
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

test('defaults to the Dashboard view', () => {
  render(<GuideBook />);
  expect(screen.getByText('Inhalt folgt.')).toBeInTheDocument();
});

test('switches to FAQ and Rules from the left nav', () => {
  render(<GuideBook />);

  fireEvent.click(screen.getByRole('button', { name: 'FAQ' }));
  expect(screen.getByText(FAQ.de[0].q)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Regeln' }));
  expect(screen.getByText(RULES.de[0].heading)).toBeInTheDocument();
});

test('opening the News section marks news read', () => {
  render(<GuideBook />);

  fireEvent.click(screen.getByRole('button', { name: 'News' }));

  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/news/mark-read'),
    expect.objectContaining({ method: 'POST' }),
  );
});
