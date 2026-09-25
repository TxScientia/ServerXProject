import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import LobbyLayout from '../../pageLayouts/lobbyLayout/LobbyLayout';
import WantedAdList from '../../components/WantedAds/WantedAdList';
import WantedAdComposer from '../../components/WantedAds/WantedAdComposer';
import styles from './Gesuche.module.css';

export default function GesuchePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const inServer = Boolean(localStorage.getItem('characterId'));
  const [composing, setComposing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
    }
  }, [navigate]);

  const content = (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('gesuche.pageTitle')}</h1>
          <p className={styles.subtitle}>{t('gesuche.pageSubtitle')}</p>
        </div>
        {inServer && !composing && (
          <button type="button" className="button" onClick={() => setComposing(true)}>
            {t('gesuche.new')}
          </button>
        )}
      </div>

      {composing && (
        <WantedAdComposer
          scope={{ type: 'global' }}
          onCreated={() => {
            setComposing(false);
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setComposing(false)}
        />
      )}

      <WantedAdList scope={{ type: 'global' }} refreshKey={refreshKey} />
    </div>
  );

  return inServer ? <AppLayout>{content}</AppLayout> : <LobbyLayout>{content}</LobbyLayout>;
}
