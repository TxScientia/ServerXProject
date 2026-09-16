import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import styles from './LobbyLayout.module.css';

// Account-scoped nav only — no character-scoped items. Placeholders until built.
const LOBBY_NAV = ['nav.pm', 'nav.settings', 'nav.systemNews', 'nav.faq'];

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
          {LOBBY_NAV.map((key) => (
            <button key={key} type="button" className={styles.navLink} disabled title={t('common.comingSoon')}>
              {t(key)}
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
