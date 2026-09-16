import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import CharacterList, { Character } from '../../components/CharacterList';
import { apiUrl, authHeaders } from '../../api';
import styles from './Residents.module.css';

export default function Residents() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      .catch(() => setError(t('residents.loadError')));
  }, [navigate, t]);

  useEffect(() => {
    fetchResidents();
  }, [fetchResidents]);

  const leftNav = <div className={styles.sideTitle}>{t('residents.sideTitle')}</div>;

  return (
    <AppLayout leftNav={leftNav}>
      <h1 className={styles.pageTitle}>{t('residents.pageTitle')}</h1>
      <p className={styles.muted}>{t('residents.allNote')}</p>

      {error && <p className={styles.error}>{error}</p>}

      <CharacterList characters={residents} />
    </AppLayout>
  );
}
