import { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Badge from '../../components/Badge/Badge';
import { Modal, ModalActions, ModalSpacer } from '../../components/Modal';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import {
  apiUrl,
  authHeaders,
  characterHeaders,
  clearAuthToken,
  FAVORITES_EVENT,
  NEWS_READ_EVENT,
} from '../../api';
import { getShowUnreadBadge, PREFS_EVENT } from '../../preferences';
import { useWebSocket } from '../../realtime/WebSocketProvider';
import styles from './AppLayout.module.css';

// Global top-nav. Items without a path are placeholders for not-yet-built features.
// News lives inside the GuideBook area now (not its own top-nav item).
const GLOBAL_NAV: { key: string; path: string | null }[] = [
  { key: 'nav.gesuche', path: '/gesuche' },
  { key: 'nav.oocChat', path: null },
  { key: 'nav.pm', path: '/pm' },
  { key: 'nav.residents', path: '/residents' },
  { key: 'nav.storybooks', path: '/storybooks' },
];

const RIGHT_NAV: { key: string; path: string | null }[] = [
  { key: 'nav.myCharacters', path: '/lobby' },
  { key: 'nav.guidebook', path: '/guidebook' },
  { key: 'nav.settings', path: '/settings' },
];

function TopNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { pmUnread } = useWebSocket();
  const [newsUnread, setNewsUnread] = useState(0);
  const [showBadge, setShowBadge] = useState(getShowUnreadBadge());

  // Keep the badge toggle live when changed in Settings (same tab) or another tab.
  useEffect(() => {
    const sync = () => setShowBadge(getShowUnreadBadge());
    window.addEventListener(PREFS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PREFS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    fetch(apiUrl('/news/unread-count'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setNewsUnread(data?.count ?? 0))
      .catch(() => undefined);
  }, [location.pathname]);

  // Clear the badge immediately when news is read (from the GuideBook News section).
  useEffect(() => {
    const clear = () => setNewsUnread(0);
    window.addEventListener(NEWS_READ_EVENT, clear);
    return () => window.removeEventListener(NEWS_READ_EVENT, clear);
  }, []);

  const go = (item: { key: string; path: string | null }) => {
    if (item.key === 'nav.oocChat') {
      // Open the global OOC chat in its own browser window (re-focuses if already open).
      window.open('/ooc', 'serverx-ooc', 'popup,width=440,height=680');
      return;
    }
    if (item.path) navigate(item.path);
  };

  const logout = () => {
    localStorage.removeItem('characterId');
    localStorage.removeItem('characterName');
    localStorage.removeItem('isGlobalAdmin');
    clearAuthToken(); // removes token + triggers the realtime WebSocket to disconnect
    navigate('/');
  };

  return (
    <>
      <header className={styles.topbar}>
        <nav className={styles.topLeft} aria-label="Global navigation">
          {GLOBAL_NAV.map((item) => (
            <div key={item.key} className={styles.navItemWrapper}>
              <button
                type="button"
                className={styles.navLink}
                onClick={() => go(item)}
                disabled={!item.path && item.key !== 'nav.oocChat'}
                title={!item.path && item.key !== 'nav.oocChat' ? t('common.comingSoon') : undefined}
              >
                {t(item.key)}
              </button>
              {showBadge && item.key === 'nav.pm' && <Badge count={pmUnread} variant="nav" />}
            </div>
          ))}
        </nav>

        <div className={styles.logo}>LOGO</div>

        <nav className={styles.topRight} aria-label="Account navigation">
          {RIGHT_NAV.map((item) => (
            <div key={item.key} className={styles.navItemWrapper}>
              <button
                type="button"
                className={styles.navLink}
                onClick={() => go(item)}
                disabled={!item.path}
                title={item.path ? undefined : t('common.comingSoon')}
              >
                {t(item.key)}
              </button>
              {showBadge && item.key === 'nav.guidebook' && (
                <Badge count={newsUnread} variant="nav" />
              )}
            </div>
          ))}
          <button type="button" className={styles.navLink} onClick={logout}>
            {t('common.logout')}
          </button>
          <LanguageSwitcher />
        </nav>
      </header>
    </>
  );
}

type CharacterPlot = { id: string; title: string; role: string };
type Favorite = { place_id: string; place_title: string; space_id: string; space_title: string };

function CharacterSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const name = localStorage.getItem('characterName');
  const [plots, setPlots] = useState<CharacterPlot[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [pendingDelete, setPendingDelete] = useState<Favorite | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('token') || !localStorage.getItem('characterId')) return;
    const headers = { ...authHeaders(), ...characterHeaders() };
    const load = () => {
      fetch(apiUrl('/me/plots'), { headers })
        .then((res) => (res.ok ? res.json() : []))
        .then(setPlots)
        .catch(() => undefined);
      fetch(apiUrl('/me/favorites'), { headers })
        .then((res) => (res.ok ? res.json() : []))
        .then(setFavorites)
        .catch(() => undefined);
    };
    load();
    // Refresh when a favourite is toggled elsewhere (e.g. from a plot's place view).
    const onFavorites = () => load();
    window.addEventListener(FAVORITES_EVENT, onFavorites);
    return () => window.removeEventListener(FAVORITES_EVENT, onFavorites);
  }, []);

  const confirmRemoveFavorite = () => {
    if (!pendingDelete) return;
    const fav = pendingDelete;
    fetch(apiUrl(`/me/favorites/${fav.place_id}`), {
      method: 'DELETE',
      headers: { ...authHeaders(), ...characterHeaders() },
    })
      .then((res) => {
        if (!res.ok) return;
        setFavorites((prev) => prev.filter((f) => f.place_id !== fav.place_id));
        window.dispatchEvent(new Event(FAVORITES_EVENT)); // keep a plot's star in sync
      })
      .catch(() => undefined)
      .finally(() => setPendingDelete(null));
  };

  return (
    <aside className={styles.rightSidebar} aria-label="Character details">
      <div className={styles.charName}>{name ?? t('sidebar.noCharacter')}</div>
      <ul className={styles.charLinks}>
        <li className={styles.charLink}>{t('sidebar.biografie')}</li>
        <li className={styles.charLink}>{t('sidebar.steckbrief')}</li>
      </ul>

      {/* Houses — not built yet (own 'later' feature). */}
      <div className={styles.charSection}>
        <h4>{t('sidebar.haeuser')}</h4>
        <p className={styles.placeholder}>—</p>
      </div>

      <div className={styles.charSection}>
        <h4>{t('sidebar.plots')}</h4>
        {plots.length === 0 ? (
          <p className={styles.placeholder}>{t('sidebar.noPlots')}</p>
        ) : (
          <ul className={styles.charLinks}>
            {plots.map((p) => (
              <li
                key={p.id}
                className={styles.charLink}
                onClick={() => navigate(`/storybooks/${p.id}?enter=1`)}
              >
                {p.title}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.charSection}>
        <h4>{t('sidebar.favOrte')}</h4>
        {favorites.length === 0 ? (
          <p className={styles.placeholder}>{t('sidebar.noFavorites')}</p>
        ) : (
          <ul className={styles.charLinks}>
            {favorites.map((f) => (
              <li key={f.place_id} className={styles.favRow} title={f.space_title}>
                <span
                  className={styles.favTravel}
                  onClick={() => navigate(`/storybooks/${f.space_id}?enter=1&place=${f.place_id}`)}
                >
                  {f.place_title}
                </span>
                <button
                  type="button"
                  className={styles.favRemove}
                  onClick={() => setPendingDelete(f)}
                  title={t('sidebar.removeFavorite')}
                  aria-label={t('sidebar.removeFavorite')}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingDelete && (
        <Modal title={t('sidebar.removeFavorite')}>
          <p>{t('sidebar.removeFavoriteConfirm', { name: pendingDelete.place_title })}</p>
          <ModalActions>
            <button type="button" className="button" onClick={() => setPendingDelete(null)}>
              {t('common.cancel')}
            </button>
            <ModalSpacer />
            <button type="button" className="button" onClick={confirmRemoveFavorite}>
              {t('common.delete')}
            </button>
          </ModalActions>
        </Modal>
      )}
    </aside>
  );
}

type AppLayoutProps = {
  leftNav?: ReactNode;
  children: ReactNode;
};

/**
 * Shared page shell: top navbar (always), a context-specific left nav, the center
 * content, and the character sidebar (always). Every page renders inside this.
 */
export default function AppLayout({ leftNav, children }: AppLayoutProps) {
  return (
    <div className={styles.shell}>
      <TopNavbar />
      <div className={styles.body}>
        <nav className={styles.leftNav} aria-label="Section navigation">
          {leftNav}
        </nav>
        <main className={styles.center}>{children}</main>
        <CharacterSidebar />
      </div>
    </div>
  );
}
