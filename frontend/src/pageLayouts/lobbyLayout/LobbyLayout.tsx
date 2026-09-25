import { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Badge from '../../components/Badge/Badge';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { apiUrl, authHeaders } from '../../api';
import styles from './LobbyLayout.module.css';

// Account-scoped nav only — no character-scoped items. Items without a path are placeholders.
const LOBBY_NAV: { key: string; path: string | null; adminOnly?: boolean }[] = [
  { key: 'nav.myCharacters', path: '/lobby' },
  { key: 'nav.pm', path: '/pm' },
  { key: 'nav.news', path: '/news' },
  { key: 'nav.admin', path: '/admin', adminOnly: true },
  { key: 'nav.settings', path: null },
  { key: 'nav.faq', path: null },
];

type LobbyLayoutProps = {
  children: ReactNode;
  pmUnreadCount?: number;
};

/**
 * Pre-character "lobby" shell: shown after login, before a character is selected.
 * Minimal account-only top nav, no character sidebar. Picking a character (in the
 * page content) "enters the server" and moves to the full AppLayout.
 */
export default function LobbyLayout({ children, pmUnreadCount }: LobbyLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isGlobalAdmin') === '1');
  const [newsUnread, setNewsUnread] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    fetch(apiUrl('/me'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (!me) return;
        localStorage.setItem('isGlobalAdmin', me.is_global_admin ? '1' : '0');
        setIsAdmin(Boolean(me.is_global_admin));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    if (location.pathname === '/news') {
      setNewsUnread(0);
      return;
    }
    fetch(apiUrl('/news/unread-count'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setNewsUnread(data?.count ?? 0))
      .catch(() => undefined);
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('characterId');
    localStorage.removeItem('characterName');
    localStorage.removeItem('isGlobalAdmin');
    navigate('/');
  };

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <nav className={styles.left} aria-label="Account navigation">
          {LOBBY_NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <div key={item.key} className={styles.navItemWrapper}>
              <button
                type="button"
                className={styles.navLink}
                disabled={!item.path}
                onClick={() => item.path && navigate(item.path)}
                title={item.path ? undefined : t('common.comingSoon')}
              >
                {t(item.key)}
              </button>
              {item.key === 'nav.pm' && <Badge count={pmUnreadCount || 0} variant="nav" />}
              {item.key === 'nav.news' && <Badge count={newsUnread} variant="nav" />}
            </div>
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
