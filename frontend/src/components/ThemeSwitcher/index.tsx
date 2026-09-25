import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyTheme, getInitialTheme, THEMES, type ThemeName } from '../../theme';
import styles from './ThemeSwitcher.module.css';

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme());

  const change = (next: ThemeName) => {
    setTheme(next);
    applyTheme(next);
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
