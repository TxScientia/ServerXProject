import { useTranslation } from 'react-i18next';
import Card from '../Card';
import { RichText } from '../RichTextEditor';
import type { WantedAd } from './types';
import styles from './WantedAds.module.css';

interface WantedAdCardProps {
  ad: WantedAd;
  /** True if the current character may delete this ad (author, or plot moderator). */
  canDelete: boolean;
  /** True if a Message button should be offered (an active character that isn't the author). */
  canMessage: boolean;
  onDelete: (id: string) => void;
  onMessage: (ad: WantedAd) => void;
}

export default function WantedAdCard({ ad, canDelete, canMessage, onDelete, onMessage }: WantedAdCardProps) {
  const { t } = useTranslation();
  const author = ad.author_name ?? '???';
  const timestamp = new Date(ad.created_at).toLocaleString('de-CH');

  return (
    <Card className={styles.card}>
      <header className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>{ad.title}</h2>
        <span className={styles.byline}>
          {t('gesuche.by', { author })} · {timestamp}
        </span>
      </header>

      <div className={styles.body}>
        <RichText value={ad.body} />
      </div>

      <footer className={styles.cardFooter}>
        {canMessage && (
          <button type="button" className="button button--ghost" onClick={() => onMessage(ad)}>
            ✉ {t('gesuche.message')}
          </button>
        )}
        {canDelete && (
          <button type="button" className="button button--ghost" onClick={() => onDelete(ad.id)}>
            {t('gesuche.delete')}
          </button>
        )}
      </footer>
    </Card>
  );
}
