import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import CharacterList, { Character } from '../../components/CharacterList';
import { apiUrl, authHeaders } from '../../api';
import styles from './Residents.module.css';

export default function Residents() {
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Character[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchResidents = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    if (!localStorage.getItem('characterId')) {
      navigate('/lobby');
      return;
    }
    fetch(apiUrl('/residents'), { headers: { ...authHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setResidents)
      .catch(() => setError('Bewohner konnten nicht geladen werden.'));
  }, [navigate]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  const leftNav = <div className={styles.sideTitle}>Residents</div>;

  return (
    <AppLayout leftNav={leftNav}>
      <h1 className={styles.pageTitle}>Residents</h1>
      <p className={styles.muted}>Alle Charaktere. (Online-Status folgt später.)</p>

      {error && <p className={styles.error}>{error}</p>}

      <CharacterList characters={residents} />
    </AppLayout>
  );
}
