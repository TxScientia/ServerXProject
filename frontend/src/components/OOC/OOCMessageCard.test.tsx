import { render, screen } from '../../test-utils';
import OOCMessageCard from './OOCMessageCard';
import type { OOCMessage } from './types';

const base = {
  id: 'm1',
  scope_type: 'global' as const,
  space_id: null,
  author_character_id: 'c1',
  author_name: 'Arthas',
  created_at: '2026-01-01T00:00:00Z',
  edited_at: null,
};

test('renders a roll message as its server-computed text', () => {
  const message: OOCMessage = {
    ...base,
    kind: 'roll',
    body: { kind: 'dice', text: '🎲 Arthas würfelte eine 14 (W20).' },
  };
  render(<OOCMessageCard message={message} />);
  expect(screen.getByText('🎲 Arthas würfelte eine 14 (W20).')).toBeInTheDocument();
  // The roll line replaces the normal author byline.
  expect(screen.queryByText('Arthas')).not.toBeInTheDocument();
});

test('renders a normal message as rich text with a byline', () => {
  const message: OOCMessage = {
    ...base,
    kind: null,
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hallo' }] }] },
  };
  render(<OOCMessageCard message={message} />);
  expect(screen.getByText('Hallo')).toBeInTheDocument();
  expect(screen.getByText('Arthas')).toBeInTheDocument();
});
