import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import NewsList from '../../components/News/NewsList';
import { apiUrl, authHeaders, NEWS_READ_EVENT } from '../../api';
import { FAQ, RULES } from './content';
import styles from './GuideBook.module.css';

type View = 'dashboard' | 'faq' | 'news' | 'regeln';

export default function GuideBook() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<View>('dashboard');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    if (!localStorage.getItem('characterId')) {
      navigate('/lobby');
    }
  }, [navigate]);

  // Opening the News section marks global news as read and clears the nav badge.
  useEffect(() => {
    if (view !== 'news') return;
    fetch(apiUrl('/news/mark-read'), { method: 'POST', headers: authHeaders() })
      .then(() => window.dispatchEvent(new Event(NEWS_READ_EVENT)))
      .catch(() => undefined);
  }, [view]);

  const lang = i18n.language.startsWith('de') ? 'de' : 'en';

  const nav: { key: View; label: string }[] = [
    { key: 'dashboard', label: t('guidebook.dashboard') },
    { key: 'faq', label: t('guidebook.faq') },
    { key: 'news', label: t('guidebook.news') },
    { key: 'regeln', label: t('guidebook.regeln') },
  ];

  const leftNav = (
    <div className={styles.sideNav}>
      <div className={styles.sideTitle}>{t('guidebook.title')}</div>
      {nav.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`${styles.sideItem} ${view === item.key ? styles.active : ''}`}
          onClick={() => setView(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  return (
    <AppLayout leftNav={leftNav}>
      {view === 'dashboard' && (
        <section className={styles.section}>
          <h1 className={styles.pageTitle}>{t('guidebook.title')}</h1>
          <p className={styles.muted}>{t('guidebook.dashboardPlaceholder')}</p>
        </section>
      )}

      {view === 'faq' && (
        <section className={styles.section}>
          <h1 className={styles.pageTitle}>{t('guidebook.faq')}</h1>
          <dl className={styles.faq}>
            {FAQ[lang].map((item) => (
              <div key={item.q} className={styles.faqItem}>
                <dt className={styles.faqQuestion}>{item.q}</dt>
                <dd className={styles.faqAnswer}>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {view === 'news' && (
        <section className={styles.section}>
          <h1 className={styles.pageTitle}>{t('news.pageTitle')}</h1>
          <p className={styles.muted}>{t('news.pageSubtitle')}</p>
          <NewsList scope={{ type: 'global' }} />
        </section>
      )}

      {view === 'regeln' && (
        <section className={styles.section}>
          <h1 className={styles.pageTitle}>{t('guidebook.regeln')}</h1>
          <div className={styles.rules}>
            {RULES[lang].map((rule) => (
              <div key={rule.heading} className={styles.ruleSection}>
                <h2 className={styles.ruleHeading}>{rule.heading}</h2>
                <p className={styles.ruleBody}>{rule.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppLayout>
  );
}
