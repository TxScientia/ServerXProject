import { useTranslation } from 'react-i18next';
import { OOCChannel } from '../../components/OOC';
import styles from './OOCPopup.module.css';

/**
 * Standalone global OOC chat, rendered in its own browser window (opened via
 * window.open from the top nav). No app chrome — just the chat, filling the window.
 * Same-origin, so it shares the login token from localStorage.
 */
export default function OOCPopup() {
  const { t } = useTranslation();

  return (
    <div className={styles.window}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('ooc.globalTitle')}</h1>
      </header>
      <div className={styles.body}>
        <OOCChannel scope={{ type: 'global' }} scroll />
      </div>
    </div>
  );
}
