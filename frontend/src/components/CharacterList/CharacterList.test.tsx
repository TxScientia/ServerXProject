import { render, screen, fireEvent } from '../../test-utils';
import CharacterList from './index';

const chars = [
  { id: '1', name: 'Arthas', race: 'Mensch', spec: 'Paladin', gender: 'Männlich' },
];

test('renders each character in a table', () => {
  render(<CharacterList characters={chars} />);
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByText('Arthas')).toBeInTheDocument();
  expect(screen.getByText('Paladin')).toBeInTheDocument();
});

test('renders a profile icon link in a separate actions column when enabled', () => {
  render(
    <CharacterList
      characters={chars}
      profilePageHref={(character) => `/characters/${character.id}/profile`}
    />,
  );

  expect(screen.getAllByRole('columnheader')).toHaveLength(5);
  const profileLink = screen.getByRole('link', { name: 'Arthas Profil in neuem Tab öffnen' });
  expect(profileLink).toHaveAttribute('href', '/characters/1/profile');
  expect(profileLink).toHaveAttribute('target', '_blank');
  expect(profileLink).toHaveTextContent('👁');
});

test('favorite and delete icons are separate actions that never select the character', () => {
  const onSelect = vi.fn();
  const onToggleFavorite = vi.fn();
  const onDelete = vi.fn();
  render(<CharacterList characters={chars} onSelect={onSelect} onToggleFavorite={onToggleFavorite} onDelete={onDelete} />);
  const favorite = screen.getByRole('button', { name: 'Arthas favorisieren' });
  expect(favorite).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(favorite);
  expect(onToggleFavorite).toHaveBeenCalledWith(chars[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Arthas löschen' }));
  expect(onDelete).toHaveBeenCalledWith(chars[0]);
  expect(onSelect).not.toHaveBeenCalled();
});

test('favorite state and busy actions are accessible', () => {
  render(<CharacterList characters={[{ ...chars[0], isFavorite: true }]} onToggleFavorite={vi.fn()} onDelete={vi.fn()} busyCharacterIds={new Set(['1'])} />);
  const favorite = screen.getByRole('button', { name: 'Arthas aus Favoriten entfernen' });
  expect(favorite).toHaveAttribute('aria-pressed', 'true');
  expect(favorite).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Arthas löschen' })).toBeDisabled();
});

test('calls onSelect with the character when its name cell is clicked', () => {
  const onSelect = vi.fn();
  render(<CharacterList characters={chars} onSelect={onSelect} />);
  fireEvent.click(screen.getByText('Arthas'));
  expect(onSelect).toHaveBeenCalledWith(chars[0]);
});

test('does not select a character when other cells or the row are clicked', () => {
  const onSelect = vi.fn();
  render(<CharacterList characters={chars} onSelect={onSelect} />);
  for (const value of ['Mensch', 'Paladin', 'Männlich']) {
    fireEvent.click(screen.getByText(value));
  }
  fireEvent.click(screen.getByText('Arthas').closest('tr')!);
  expect(onSelect).not.toHaveBeenCalled();
});

test('selects only the requested character and supports keyboard selection', () => {
  const other = { ...chars[0], id: '2', name: 'Jaina' };
  const onSelect = vi.fn();
  render(<CharacterList characters={[...chars, other]} onSelect={onSelect} />);
  fireEvent.click(screen.getByText('Jaina'));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith(other);
  onSelect.mockClear();
  fireEvent.keyDown(screen.getByText('Arthas'), { key: 'Enter' });
  fireEvent.keyDown(screen.getByText('Arthas'), { key: ' ' });
  expect(onSelect).toHaveBeenCalledTimes(2);
  expect(onSelect).toHaveBeenLastCalledWith(chars[0]);
});
