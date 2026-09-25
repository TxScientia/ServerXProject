import { useTranslation } from 'react-i18next';
import { RichText } from '../RichTextEditor';
import type { NewsItem } from './types';
import styles from './News.module.css';

type Props = { item: NewsItem };

export default function NewsCard({ item }: Props) {
  const { t, i18n } = useTranslation();
  const author = item.author_character_name ?? item.author_login_name ?? t('news.systemAuthor');
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(item.created_at),
  );

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>{item.title}</h2>
          <div className={styles.meta}>{t('news.byline', { author, date })}</div>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles[item.kind]}`}>{t(`news.kind.${item.kind}`)}</span>
          {item.pinned && <span className={`${styles.badge} ${styles.pinned}`}>{t('news.pinned')}</span>}
        </div>
      </header>
      <div className={styles.body}>
        <RichText value={item.body} />
      </div>
    </article>
  );
}
