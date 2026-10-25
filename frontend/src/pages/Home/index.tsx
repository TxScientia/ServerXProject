import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiUrl, setAuthToken } from '../../api';
import { applyTheme } from '../../theme';
import { setShowUnreadBadge } from '../../preferences';
import styles from './Home.module.css';

const HERO_IMAGE_URL = '/pictures/hero-background.webp';
const HERO_BORDER_URL = '/pictures/hero-border.webp';

const worldTags = ['FSK 18', 'Private RP', 'Multiverse', 'Eng & Ger', 'Xyz'];

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
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
      localStorage.setItem('isGlobalAdmin', data.is_global_admin ? '1' : '0');
      // Hydrate account preferences (server is source of truth) before entering.
      if (data.theme) applyTheme(data.theme);
      setShowUnreadBadge(data.show_unread_badge ?? true);
      setAuthToken(data.token); // stores token + triggers the realtime WebSocket to connect
      navigate('/lobby');
    } catch (loginError) {
      setError(t('home.loginError'));
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

        <h1 className={styles.title}>{t('home.appTitle')}</h1>
        <nav className={styles.nav} aria-label="World tags">
          {worldTags.map((tag) => (
            <span key={tag} className="button button--ghost">
              {tag}
            </span>
          ))}
        </nav>
      </section>

      <main className={`page-content ${styles.loginContent}`}>
        <h2 className={styles.heading}>{t('home.enterWorlds')}</h2>
        {searchParams.get('session') === 'expired' && (
          <p role="status">{t('home.sessionExpired')}</p>
        )}
        <form className={`form-stack ${styles.loginForm}`} onSubmit={handleLogin}>
          <label className="form-field" htmlFor="login-user">
            <span className="form-label">{t('home.usernameLabel')}</span>
            <input
              className="text-input"
              type="text"
              id="login-user"
              name="user"
              placeholder={t('home.usernamePlaceholder')}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="form-field" htmlFor="login-password">
            <span className="form-label">{t('home.passwordLabel')}</span>
            <input
              className="text-input"
              type="password"
              id="login-password"
              name="password"
              placeholder={t('home.passwordPlaceholder')}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('home.submitting') : t('home.submit')}
          </button>
        </form>
      </main>

      <footer className="site-footer">{t('home.footer')}</footer>
    </div>
  );
}
