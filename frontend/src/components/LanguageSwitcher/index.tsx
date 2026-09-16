import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import styles from './LanguageSwitcher.module.css';

/** DE / EN toggle. Persists the choice (see i18n.ts languageChanged handler). */
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className={styles.switcher} role="group" aria-label="Language">
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          className={`${styles.lang} ${i18n.resolvedLanguage === lng ? styles.active : ''}`.trim()}
          onClick={() => i18n.changeLanguage(lng)}
          aria-pressed={i18n.resolvedLanguage === lng}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
