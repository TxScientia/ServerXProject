import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '../../test-utils';
import CreateChatModal from './CreateChatModal';

const characters = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'carol', name: 'Carol' },
];
const creator = { id: 'me', name: 'My character' };

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => characters }));
});

afterEach(() => vi.unstubAllGlobals());

function setup() {
  const onCreateDirect = vi.fn();
  const onCreateGroup = vi.fn();
  render(<CreateChatModal onClose={vi.fn()} onCreateDirect={onCreateDirect} onCreateGroup={onCreateGroup} accountCharacters={[creator]} />);
  return { onCreateDirect, onCreateGroup };
}

test('search and selected recipients share one field, clearing search after selection', async () => {
  const { onCreateDirect } = setup();
  await screen.findByRole('option', { name: 'Alice' });
  const input = screen.getByRole('combobox', { name: 'An' });
  fireEvent.change(input, { target: { value: 'ali' } });
  expect(screen.queryByRole('option', { name: 'Bob' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('option', { name: 'Alice' }));
  expect(input).toHaveValue('');
  expect(input).toHaveFocus();
  expect(within(input.parentElement!).getByText('Alice')).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Alice' })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Bob' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Erstellen' }));
  expect(onCreateDirect).toHaveBeenCalledWith('alice', 'me', undefined);
});

test('multiple recipients create a group and chips can be removed and re-added', async () => {
  const { onCreateGroup } = setup();
  fireEvent.click(await screen.findByRole('option', { name: 'Alice' }));
  fireEvent.click(screen.getByRole('option', { name: 'Bob' }));
  fireEvent.change(screen.getByPlaceholderText('Chatname (optional)'), { target: { value: 'Friends' } });
  fireEvent.click(screen.getByRole('button', { name: 'Erstellen' }));
  expect(onCreateGroup).toHaveBeenCalledWith(['alice', 'bob'], 'Friends', 'me');
  fireEvent.click(screen.getByRole('button', { name: 'Bob entfernen' }));
  expect(screen.getByLabelText('Chatname (optional)')).toHaveValue('Friends');
  expect(screen.getByRole('option', { name: 'Bob' })).toBeInTheDocument();
  expect(screen.getByRole('combobox')).toHaveFocus();
});

test('arrow keys and Enter add recipients; Backspace only removes chips for an empty search', async () => {
  setup();
  await screen.findByRole('option', { name: 'Alice' });
  const input = screen.getByRole('combobox');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { name: 'Alice' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('button', { name: 'Bob entfernen' })).toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'car' } });
  fireEvent.keyDown(input, { key: 'Backspace' });
  expect(screen.getByRole('button', { name: 'Bob entfernen' })).toBeInTheDocument();
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.keyDown(input, { key: 'Backspace' });
  expect(screen.queryByRole('button', { name: 'Bob entfernen' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Erstellen' })).toBeDisabled();
});

test('a direct chat can be named before selecting recipients', async () => {
  const { onCreateDirect } = setup();
  fireEvent.change(screen.getByLabelText('Chatname (optional)'), { target: { value: '  Our story  ' } });
  fireEvent.click(await screen.findByRole('option', { name: 'Alice' }));
  fireEvent.click(screen.getByRole('button', { name: 'Erstellen' }));
  expect(onCreateDirect).toHaveBeenCalledWith('alice', 'me', 'Our story');
});

test('typing does not repeatedly fetch recipients', async () => {
  setup();
  await screen.findByRole('option', { name: 'Alice' });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } });
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
});
