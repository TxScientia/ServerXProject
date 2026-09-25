import { useTranslation } from 'react-i18next';
import OOCChannel from './OOCChannel';
import styles from './OOC.module.css';

export { default as OOCChannel } from './OOCChannel';
export * from './types';

export function GlobalOOCOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div className={styles.overlayBackdrop} role="dialog" aria-modal="true">
      <div className={styles.overlay}>
        <header className={styles.overlayHeader}>
          <h2 className={styles.overlayTitle}>{t('ooc.globalTitle')}</h2>
          <button type="button" className="button button--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </header>
        <OOCChannel scope={{ type: 'global' }} scroll />
      </div>
    </div>
  );
}
