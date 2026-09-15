import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AppLayout.module.css';

// Global top-nav. Items without a path are placeholders for not-yet-built features.
const GLOBAL_NAV: { label: string; path: string | null }[] = [
  { label: 'Gesuche', path: null },
  { label: 'OOC-Chat', path: null },
  { label: 'PM', path: null },
  { label: 'Residents', path: '/residents' },
  { label: 'StoryBooks', path: '/storybooks' },
];

const RIGHT_NAV: { label: string; path: string | null }[] = [
  { label: 'My Characters', path: '/lobby' },
  { label: 'Settings', path: null },
  { label: 'FAQ', path: null },
];

function TopNavbar() {
  const navigate = useNavigate();
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
            key={item.label}
            type="button"
            className={styles.navLink}
            onClick={() => go(item.path)}
            disabled={!item.path}
            title={item.path ? undefined : 'Bald verfügbar'}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className={styles.logo}>LOGO</div>

      <nav className={styles.topRight} aria-label="Account navigation">
        {RIGHT_NAV.map((item) => (
          <button
            key={item.label}
            type="button"
            className={styles.navLink}
            onClick={() => go(item.path)}
            disabled={!item.path}
            title={item.path ? undefined : 'Bald verfügbar'}
          >
            {item.label}
          </button>
        ))}
        <button type="button" className={styles.navLink} onClick={logout}>
          Logout
        </button>
      </nav>
    </header>
  );
}

const PLACEHOLDER_SECTIONS = ['Häuser', 'Plots', 'Fav. Orte'];

function CharacterSidebar() {
  const name = localStorage.getItem('characterName');

  return (
    <aside className={styles.rightSidebar} aria-label="Character details">
      <div className={styles.charName}>{name ?? 'Kein Charakter gewählt'}</div>
      <ul className={styles.charLinks}>
        <li className={styles.charLink}>Biografie</li>
        <li className={styles.charLink}>Steckbrief</li>
      </ul>
      {PLACEHOLDER_SECTIONS.map((section) => (
        <div key={section} className={styles.charSection}>
          <h4>{section}</h4>
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
