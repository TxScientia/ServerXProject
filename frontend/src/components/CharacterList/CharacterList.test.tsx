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

test('calls onSelect with the character when its row is clicked', () => {
  const onSelect = jest.fn();
  render(<CharacterList characters={chars} onSelect={onSelect} />);
  fireEvent.click(screen.getByText('Arthas'));
  expect(onSelect).toHaveBeenCalledWith(chars[0]);
});
