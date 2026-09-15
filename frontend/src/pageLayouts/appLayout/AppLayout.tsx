import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import styles from './AppLayout.module.css';

// Global top-nav. Items without a path are placeholders for not-yet-built features.
const GLOBAL_NAV: { key: string; path: string | null }[] = [
  { key: 'nav.gesuche', path: null },
  { key: 'nav.oocChat', path: null },
  { key: 'nav.pm', path: null },
  { key: 'nav.residents', path: '/residents' },
  { key: 'nav.storybooks', path: '/storybooks' },
];

const RIGHT_NAV: { key: string; path: string | null }[] = [
  { key: 'nav.myCharacters', path: '/lobby' },
  { key: 'nav.settings', path: null },
  { key: 'nav.faq', path: null },
];

function TopNavbar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const go = (path: string | null) => {
    if (path) navigate(path);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('characterId');
    localStorage.removeItem('characterName');
    navigate('/');
  };

  return (
    <header className={styles.topbar}>
      <nav className={styles.topLeft} aria-label="Global navigation">
        {GLOBAL_NAV.map((item) => (
          <button
            key={item.key}
            type="button"
            className={styles.navLink}
            onClick={() => go(item.path)}
            disabled={!item.path}
            title={item.path ? undefined : t('common.comingSoon')}
          >
            {t(item.key)}
          </button>
        ))}
      </nav>

      <div className={styles.logo}>LOGO</div>

      <nav className={styles.topRight} aria-label="Account navigation">
        {RIGHT_NAV.map((item) => (
          <button
            key={item.key}
            type="button"
            className={styles.navLink}
            onClick={() => go(item.path)}
            disabled={!item.path}
            title={item.path ? undefined : t('common.comingSoon')}
          >
            {t(item.key)}
          </button>
        ))}
        <button type="button" className={styles.navLink} onClick={logout}>
          {t('common.logout')}
        </button>
        <LanguageSwitcher />
      </nav>
    </header>
  );
}

const PLACEHOLDER_SECTIONS = ['sidebar.haeuser', 'sidebar.plots', 'sidebar.favOrte'];

function CharacterSidebar() {
  const { t } = useTranslation();
  const name = localStorage.getItem('characterName');

  return (
    <aside className={styles.rightSidebar} aria-label="Character details">
      <div className={styles.charName}>{name ?? t('sidebar.noCharacter')}</div>
      <ul className={styles.charLinks}>
        <li className={styles.charLink}>{t('sidebar.biografie')}</li>
        <li className={styles.charLink}>{t('sidebar.steckbrief')}</li>
      </ul>
      {PLACEHOLDER_SECTIONS.map((sectionKey) => (
        <div key={sectionKey} className={styles.charSection}>
          <h4>{t(sectionKey)}</h4>
          <p className={styles.placeholder}>—</p>
        </div>
      ))}
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
