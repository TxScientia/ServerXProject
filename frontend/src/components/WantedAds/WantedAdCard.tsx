import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Modal, ModalActions } from '../Modal';
import Card from '../Card';
import { RichText } from '../RichTextEditor';
import type { WantedAd } from './types';
import { parseServerDate } from '../../utils/datetime';
import styles from './WantedAds.module.css';
import frameStyles from '../../assets/styles/ResidentFrame.module.css';

interface WantedAdCardProps {
  ad: WantedAd;
  framed?: boolean;
  /** True if the current character may delete this ad (author, or plot moderator). */
  canDelete: boolean;
  /** True if a Message button should be offered (an active character that isn't the author). */
  canMessage: boolean;
  onDelete: (id: string) => void;
  onMessage: (ad: WantedAd) => void;
}

export default function WantedAdCard({ ad, framed = false, canDelete, canMessage, onDelete, onMessage }: WantedAdCardProps) {
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const author = ad.author_name ?? '???';
  const timestamp = parseServerDate(ad.created_at).toLocaleString('de-CH');
  const tagText = (ad.tags ?? []).map((tag) => tag.toUpperCase()).join(', ');

  return (
    <Card className={`${styles.card} ${framed ? `${frameStyles.frame} ${styles.framedCard}` : ''}`}>
      {framed && <span aria-hidden="true" className={styles.adBorder} />}
      <header className={styles.cardHeader}>
        <div className={styles.cardHeading}>
          <h2 className={styles.cardTitle}>{ad.title}</h2>
          {tagText && <p className={styles.tags}>{tagText}</p>}
        </div>
        <span className={styles.byline}>
          <span>{t('gesuche.byPrefix')} <span className={styles.authorBadge}>{author}</span></span>
          <span aria-hidden="true">·</span>
          <time dateTime={ad.created_at}>{timestamp}</time>
        </span>
      </header>

      <div className={styles.body}>
        <RichText value={ad.body} />
      </div>

      <footer className={`${styles.cardFooter} ${framed ? styles.framedFooter : ''}`}>
        {framed && (
          <button type="button" className={`button ${styles.continueButton}`} onClick={() => setDetailsOpen(true)}>
            {t('gesuche.viewAd')}
          </button>
        )}
        {!framed && canMessage && (
          <button type="button" className="button button--ghost" onClick={() => onMessage(ad)}>
            ✉ {t('gesuche.message')}
          </button>
        )}
        {canDelete && (
          <button type="button" className={`button ${framed ? styles.deleteButton : 'button--ghost'}`} onClick={() => onDelete(ad.id)}>
            {t('gesuche.delete')}
          </button>
        )}
      </footer>
      {detailsOpen && createPortal(
        <Modal title={ad.title}>
          {tagText && <p className={styles.tags}>{tagText}</p>}
          <p>{t('gesuche.by', { author })} · {timestamp}</p>
          <RichText value={ad.body} />
          <ModalActions>
            <button type="button" className="button button--ghost" onClick={() => setDetailsOpen(false)}>
              {t('common.close')}
            </button>
            {canMessage && (
              <button type="button" className="button" onClick={() => onMessage(ad)}>
                ✉ {t('gesuche.message')}
              </button>
            )}
          </ModalActions>
        </Modal>,
        document.body,
      )}
    </Card>
  );
}
