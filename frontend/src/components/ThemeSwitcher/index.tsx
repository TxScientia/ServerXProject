import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders } from '../../api';
import { applyTheme, getInitialTheme, THEMES, type ThemeName } from '../../theme';
import styles from './ThemeSwitcher.module.css';

/** Persist the theme to the account (server is source of truth). Fire-and-forget:
 * the local apply already happened, and a failed sync just falls back to localStorage. */
export function persistThemePreference(theme: ThemeName) {
  if (!localStorage.getItem('token')) return;
  fetch(apiUrl('/me/preferences'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ theme }),
  }).catch(() => undefined);
}

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme());

  const change = (next: ThemeName) => {
    setTheme(next);
    applyTheme(next);
    persistThemePreference(next);
  };

  return (
    <label className={styles.switcher} aria-label={t('theme.label')}>
      <select className={styles.select} value={theme} onChange={(e) => change(e.target.value as ThemeName)}>
        {THEMES.map((name) => (
          <option key={name} value={name}>
            {t(`theme.${name}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
