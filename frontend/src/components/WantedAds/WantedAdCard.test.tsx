import { expect, test, vi } from 'vitest';
import { render, screen, fireEvent, within } from '../../test-utils';
import WantedAdCard from './WantedAdCard';
import type { WantedAd } from './types';

const ad: WantedAd = {
  id: 'ad-1', scope_type: 'global', space_id: null,
  title: 'An adventure', author_character_id: 'char-1', author_name: 'Alice',
  created_at: '2026-10-25T12:00:00',
  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Join this adventure.' }] }] },
};

test('centered continue action opens ad details rather than starting a chat', () => {
  const onMessage = vi.fn();
  render(<WantedAdCard ad={ad} framed canDelete={false} canMessage onDelete={vi.fn()} onMessage={onMessage} />);
  expect(screen.queryByRole('button', { name: /Nachricht/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'WEITER ZUM GESUCH >' }));
  expect(onMessage).not.toHaveBeenCalled();
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('An adventure')).toBeInTheDocument();
  expect(within(dialog).getByText('Join this adventure.')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: /Nachricht/ }));
  expect(onMessage).toHaveBeenCalledWith(ad);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Schließen' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('authors can open their own ad and retain the delete action', () => {
  const onDelete = vi.fn();
  render(<WantedAdCard ad={ad} framed canDelete canMessage={false} onDelete={onDelete} onMessage={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Löschen' }));
  expect(onDelete).toHaveBeenCalledWith(ad.id);
  fireEvent.click(screen.getByRole('button', { name: 'WEITER ZUM GESUCH >' }));
  expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /Nachricht/ })).not.toBeInTheDocument();
});
