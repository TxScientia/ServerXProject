import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import LobbyLayout from '../../pageLayouts/lobbyLayout/LobbyLayout';
import WantedAdList from '../../components/WantedAds/WantedAdList';
import WantedAdComposer from '../../components/WantedAds/WantedAdComposer';
import styles from './Gesuche.module.css';
import PageHeading from '../../components/PageHeading';

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
        <PageHeading title={t('gesuche.pageTitle')} subtitle={t('gesuche.pageSubtitle')} />
        {inServer && !composing && (
          <div className={styles.actions}>
            <button type="button" className={`button ${styles.createButton}`} onClick={() => setComposing(true)}>
              {t('gesuche.createGlobal')}
            </button>
          </div>
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

  return inServer ? <AppLayout scrollCenterFromPage hideCenterScrollbar growCenterFrame>{content}</AppLayout> : <LobbyLayout>{content}</LobbyLayout>;
}
