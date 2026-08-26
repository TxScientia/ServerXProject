import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../api';
import styles from './Home.module.css';

const PUBLIC_ASSET_BASE = process.env.PUBLIC_URL || '';
const HERO_IMAGE_URL = `${PUBLIC_ASSET_BASE}/pictures/hero-background.webp`;
const HERO_BORDER_URL = `${PUBLIC_ASSET_BASE}/pictures/hero-border.webp`;

const worldTags = ['FSK 18', 'Private RP', 'Multiverse', 'Eng & Ger', 'Xyz'];

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl('/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_name: username,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      navigate('/characters');
    } catch (loginError) {
      setError('Login fehlgeschlagen. Bitte überprüfe deine Eingaben.');
      console.error(loginError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <section className={styles.hero} aria-label="When Worlds Collide Login">
        <img
          className={styles.heroBackground}
          src={HERO_IMAGE_URL}
          alt=""
          loading="eager"
          aria-hidden="true"
        />

        <div
          className={styles.heroBorderFrame}
          style={{ '--hero-border-image': `url(${HERO_BORDER_URL})` } as React.CSSProperties}
          aria-hidden="true"
        />

        <h1 className={styles.title}>when worlds collide</h1>
        <nav className={styles.nav} aria-label="World tags">
          {worldTags.map((tag) => (
            <span key={tag} className="button button--ghost">
              {tag}
            </span>
          ))}
        </nav>
      </section>

      <main className={`page-content ${styles.loginContent}`}>
        <h2 className={styles.heading}>Betrete die Welten:</h2>
        <form className={`form-stack ${styles.loginForm}`} onSubmit={handleLogin}>
          <label className="form-field" htmlFor="login-user">
            <span className="form-label">Benutzername oder E-Mail:</span>
            <input
              className="text-input"
              type="text"
              id="login-user"
              name="user"
              placeholder="Benutzername oder E-Mail"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="form-field" htmlFor="login-password">
            <span className="form-label">Passwort:</span>
            <input
              className="text-input"
              type="password"
              id="login-password"
              name="password"
              placeholder="Passwort"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Bitte warten …' : 'Eintreten'}
          </button>
        </form>
      </main>

      <footer className="site-footer">&copy; 2025 Worlds Collide – Alle Rechte vorbehalten</footer>
    </div>
  );
}
