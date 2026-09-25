import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LobbyLayout from '../../pageLayouts/lobbyLayout/LobbyLayout';
import NewsComposer from '../../components/News/NewsComposer';
import NewsList from '../../components/News/NewsList';
import { apiUrl, authHeaders } from '../../api';
import styles from './Admin.module.css';

type Account = {
  id: string;
  login_name: string;
  is_global_admin: boolean;
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    fetch(apiUrl('/me'), { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((me: Account) => {
        if (!me.is_global_admin) {
          navigate('/lobby');
          return;
        }
        setAccount(me);
        setError(null);
      })
      .catch(() => setError(t('admin.loadError')))
      .finally(() => setLoading(false));
  }, [navigate, t]);

  const leftNav = (
    <div className={styles.sideNav}>
      <button type="button" className={`${styles.sideItem} ${styles.active}`}>
        {t('admin.systemNews')}
      </button>
    </div>
  );

  return (
    <LobbyLayout>
      <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: '1rem' }}>
        <aside>{leftNav}</aside>
        <main className={styles.page}>
          <div>
            <h1 className={styles.title}>{t('admin.title')}</h1>
            <p className={styles.subtitle}>{t('admin.subtitle')}</p>
          </div>
          {loading ? (
            <p className={styles.muted}>{t('common.loading')}</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : account ? (
            <>
              <NewsComposer scope={{ type: 'global' }} onCreated={() => setRefreshKey((x) => x + 1)} />
              <h2>{t('news.latest')}</h2>
              <NewsList scope={{ type: 'global' }} refreshKey={refreshKey} />
            </>
          ) : null}
        </main>
      </div>
    </LobbyLayout>
  );
}
