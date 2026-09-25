import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import WantedAdList from '../../components/WantedAds/WantedAdList';
import WantedAdComposer from '../../components/WantedAds/WantedAdComposer';
import { apiUrl, authHeaders } from '../../api';
import styles from './StoryBookGesuche.module.css';

type Storybook = {
  id: string;
  title: string;
  owner_character_id: string;
};

export default function StoryBookGesuchePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    if (!localStorage.getItem('characterId')) {
      navigate('/lobby');
      return;
    }
    fetch(apiUrl(`/storybooks/${id}`), { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setStorybook)
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const canModerate =
    storybook != null && localStorage.getItem('characterId') === storybook.owner_character_id;

  const leftNav = (
    <div className={styles.sideNav}>
      <button type="button" className={styles.backItem} onClick={() => navigate(`/storybooks/${id}`)}>
        {t('plot.back')}
      </button>
      <div className={styles.sideTitle}>{storybook?.title ?? t('storybooks.pageTitle')}</div>
      <button type="button" className={`${styles.sideItem} ${styles.active}`.trim()}>
        {t('nav.gesuche')}
      </button>
    </div>
  );

  return (
    <AppLayout leftNav={leftNav}>
      <div className={styles.page}>
        {loading ? (
          <p className={styles.muted}>{t('common.loading')}</p>
        ) : (
          <>
            <div className={styles.header}>
              <div>
                <h1 className={styles.title}>{t('gesuche.plotTitle', { title: storybook?.title })}</h1>
                <p className={styles.subtitle}>{t('gesuche.plotSubtitle')}</p>
              </div>
              {!composing && (
                <button type="button" className="button" onClick={() => setComposing(true)}>
                  {t('gesuche.new')}
                </button>
              )}
            </div>

            {composing && id && (
              <WantedAdComposer
                scope={{ type: 'storybook', storybookId: id }}
                onCreated={() => {
                  setComposing(false);
                  setRefreshKey((k) => k + 1);
                }}
                onCancel={() => setComposing(false)}
              />
            )}

            {id && (
              <WantedAdList
                scope={{ type: 'storybook', storybookId: id }}
                refreshKey={refreshKey}
                canModerate={canModerate}
                emptyText={t('gesuche.emptyPlot')}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
