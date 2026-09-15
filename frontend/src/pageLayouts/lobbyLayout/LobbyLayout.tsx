import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LobbyLayout.module.css';

// Account-scoped nav only — no character-scoped items. Placeholders until built.
const LOBBY_NAV = ['PM', 'Settings', 'System News', 'FAQ'];

/**
 * Pre-character "lobby" shell: shown after login, before a character is selected.
 * Minimal account-only top nav, no character sidebar. Picking a character (in the
 * page content) "enters the server" and moves to the full AppLayout.
 */
export default function LobbyLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

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
            <button key={item} type="button" className={styles.navLink} disabled title="Bald verfügbar">
              {item}
            </button>
          ))}
        </nav>
        <div className={styles.logo}>LOGO</div>
        <nav className={styles.right} aria-label="Session">
          <button type="button" className={styles.navLink} onClick={logout}>
            Logout
          </button>
        </nav>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
