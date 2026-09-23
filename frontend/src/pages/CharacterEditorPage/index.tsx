import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CharacterEditor, { CharacterForm, EditableCharacter } from '../../components/CharacterEditor';
import { apiUrl, authHeaders } from '../../api';
import styles from './CharacterEditorPage.module.css';

export default function CharacterEditorPage() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<EditableCharacter[]>([]);
  const [error, setError] = useState<string | null>(null);

  const character = useMemo(
    () => characters.find((item) => item.id === characterId),
    [characterId, characters],
  );

  const fetchCharacters = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }

    fetch(apiUrl('/characters'), { headers: { ...authHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setCharacters)
      .catch(() => setError('Charakter konnte nicht geladen werden.'));
  }, [navigate]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const handleSave = (payload: CharacterForm) => {
    if (!characterId) return;

    fetch(apiUrl(`/characters/${characterId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(fetchCharacters)
      .catch(() => setError('Charakter konnte nicht gespeichert werden.'));
  };

  if (error) return <div className={styles.error}>{error}</div>;
  if (!character) return <div className={styles.loading}>Lade Charaktereditor…</div>;

  return (
    <main className={styles.page}>
      <CharacterEditor character={character} fullPage onSave={handleSave} onCancel={() => window.close()} />
    </main>
  );
}
