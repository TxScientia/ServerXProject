import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders } from '../../api';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import LobbyLayout from '../../pageLayouts/lobbyLayout/LobbyLayout';
import NewsList from '../../components/News/NewsList';
import styles from './News.module.css';

export default function NewsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const inServer = Boolean(localStorage.getItem('characterId'));

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    fetch(apiUrl('/news/mark-read'), { method: 'POST', headers: authHeaders() }).catch(() => undefined);
  }, [navigate]);

  const content = (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>{t('news.pageTitle')}</h1>
        <p className={styles.subtitle}>{t('news.pageSubtitle')}</p>
      </div>
      <NewsList scope={{ type: 'global' }} />
    </div>
  );

  return inServer ? <AppLayout>{content}</AppLayout> : <LobbyLayout>{content}</LobbyLayout>;
}
