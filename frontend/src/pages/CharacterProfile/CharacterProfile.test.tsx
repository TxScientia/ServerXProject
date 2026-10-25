import { Route, Routes } from 'react-router-dom';
import { render, screen } from '../../test-utils';
import CharacterProfile from './index';

beforeEach(() => {
  localStorage.setItem('token', 'my-token');
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderProfile() {
  return render(
    <Routes>
      <Route path="/characters/:characterId/profile" element={<CharacterProfile />} />
    </Routes>,
    { route: '/characters/other-character/profile' },
  );
}

test('loads another character directly and displays its read-only profile', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'other-character', name: 'Other Hero', race: 'Elf', spec: 'Mage', gender: 'Divers',
      editorData: { biography: 'Another player’s biography' },
    }),
  });
  vi.stubGlobal('fetch', fetchMock);
  renderProfile();

  expect(await screen.findByRole('heading', { name: 'Other Hero' })).toBeInTheDocument();
  expect(screen.getByText('Another player’s biography')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/characters/other-character', {
    headers: { Authorization: 'Bearer my-token' },
  });
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

test('shows a missing-character message instead of loading forever', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
  renderProfile();
  expect(await screen.findByText('Charakter nicht gefunden.')).toBeInTheDocument();
  expect(screen.queryByText('Lade Charakterprofil…')).not.toBeInTheDocument();
});

test('shows an error if the profile request fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
  renderProfile();
  expect(await screen.findByText('Charakterprofil konnte nicht geladen werden.')).toBeInTheDocument();
});
