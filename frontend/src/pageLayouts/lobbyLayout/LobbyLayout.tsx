import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import styles from './LobbyLayout.module.css';

// Account-scoped nav only — no character-scoped items. Items without a path are placeholders.
const LOBBY_NAV: { key: string; path: string | null }[] = [
  { key: 'nav.pm', path: '/pm' },
  { key: 'nav.settings', path: null },
  { key: 'nav.systemNews', path: null },
  { key: 'nav.faq', path: null },
];

/**
 * Pre-character "lobby" shell: shown after login, before a character is selected.
 * Minimal account-only top nav, no character sidebar. Picking a character (in the
 * page content) "enters the server" and moves to the full AppLayout.
 */
export default function LobbyLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('characterId');
    localStorage.removeItem('characterName');
    navigate('/');
  };

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <nav className={styles.left} aria-label="Account navigation">
          {LOBBY_NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className={styles.navLink}
              disabled={!item.path}
              onClick={() => item.path && navigate(item.path)}
              title={item.path ? undefined : t('common.comingSoon')}
            >
              {t(item.key)}
            </button>
          ))}
        </nav>
        <div className={styles.logo}>LOGO</div>
        <nav className={styles.right} aria-label="Session">
          <button type="button" className={styles.navLink} onClick={logout}>
            {t('common.logout')}
          </button>
          <LanguageSwitcher />
        </nav>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
