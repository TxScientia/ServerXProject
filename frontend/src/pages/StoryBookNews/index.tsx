import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import NewsList from '../../components/News/NewsList';
import { apiUrl, authHeaders } from '../../api';
import styles from './StoryBookNews.module.css';

type Storybook = {
  id: string;
  title: string;
};

export default function StoryBookNewsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
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

  useEffect(() => {
    if (!id || !localStorage.getItem('token')) return;
    fetch(apiUrl(`/storybooks/${id}/news/mark-read`), { method: 'POST', headers: authHeaders() }).catch(() => undefined);
  }, [id]);

  const leftNav = (
    <div className={styles.sideNav}>
      <button type="button" className={styles.backItem} onClick={() => navigate(`/storybooks/${id}`)}>
        {t('plot.back')}
      </button>
      <div className={styles.sideTitle}>{storybook?.title ?? t('storybooks.pageTitle')}</div>
      <button type="button" className={`${styles.sideItem} ${styles.active}`.trim()}>
        {t('nav.news')}
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
            <div>
              <h1 className={styles.title}>{t('plot.newsTitle', { title: storybook?.title })}</h1>
              <p className={styles.subtitle}>{t('plot.newsSubtitle')}</p>
            </div>
            {id && <NewsList scope={{ type: 'storybook', storybookId: id }} emptyText={t('news.emptyPlot')} />}
          </>
        )}
      </div>
    </AppLayout>
  );
}
