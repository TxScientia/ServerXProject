import { type ReactNode } from 'react';
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import GesuchePage from './index';

vi.mock('../../pageLayouts/appLayout/AppLayout', () => ({
  default: ({ children, pageScroll }: { children: ReactNode; pageScroll?: boolean }) => (
    <div data-testid="app-layout" data-page-scroll={pageScroll}>{children}</div>
  ),
}));
vi.mock('../../pageLayouts/lobbyLayout/LobbyLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../components/WantedAds/WantedAdList', () => ({ default: () => <div>Ad list</div> }));
vi.mock('../../components/WantedAds/WantedAdComposer', () => ({
  default: ({ onCancel }: { onCancel: () => void }) => <button onClick={onCancel}>Cancel composer</button>,
}));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('characterId', 'char-1');
});

afterEach(() => localStorage.clear());

test('shows the new headline, subtitle and create button without the old button', () => {
  render(<GesuchePage />);
  expect(screen.getByTestId('app-layout')).toHaveAttribute('data-page-scroll', 'true');
  expect(screen.getByRole('heading', { name: 'GESUCHE' })).toBeInTheDocument();
  expect(screen.getByText('GLOBALE SUCHE ALLER CHARAKTERE UND PLOTS')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'GESUCH ERSTELLEN' })).toBeInTheDocument();
  expect(screen.queryByText('+ Neues Gesuch')).not.toBeInTheDocument();
});

test('new create button opens the same composer and supports cancel', () => {
  render(<GesuchePage />);
  fireEvent.click(screen.getByRole('button', { name: 'GESUCH ERSTELLEN' }));
  expect(screen.queryByRole('button', { name: 'GESUCH ERSTELLEN' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel composer' }));
  expect(screen.getByRole('button', { name: 'GESUCH ERSTELLEN' })).toBeInTheDocument();
});

test('preserves the character requirement for creating ads', () => {
  localStorage.removeItem('characterId');
  render(<GesuchePage />);
  expect(screen.queryByRole('button', { name: 'GESUCH ERSTELLEN' })).not.toBeInTheDocument();
});
