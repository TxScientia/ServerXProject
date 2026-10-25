import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LobbyLayout from '../../pageLayouts/lobbyLayout/LobbyLayout';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import switchStyles from '../../components/ThemeSwitcher/ThemeSwitcher.module.css';
import { applyAccentHue, getAccentHue } from '../../accentHue';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { apiUrl, authHeaders } from '../../api';
import { applyTheme, type ThemeName } from '../../theme';
import { getShowUnreadBadge, setShowUnreadBadge } from '../../preferences';
import styles from './Settings.module.css';

const MIN_PASSWORD_LENGTH = 6;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [showBadge, setShowBadge] = useState(getShowUnreadBadge());
  const [accentHue, setAccentHue] = useState(getAccentHue);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  // Reconcile the local cache with the server (preferences are account-wide) before
  // rendering the controls, so the switchers mount with the authoritative values.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    fetch(apiUrl('/me'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((me) => {
        if (me) {
          applyTheme(me.theme as ThemeName);
          setShowUnreadBadge(me.show_unread_badge);
          setShowBadge(me.show_unread_badge);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [navigate]);

  const toggleBadge = (checked: boolean) => {
    setShowBadge(checked);
    setShowUnreadBadge(checked); // updates cache + notifies the nav live
    fetch(apiUrl('/me/preferences'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ show_unread_badge: checked }),
    }).catch(() => undefined);
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPwMessage({ ok: false, text: t('settings.passwordTooShort', { min: MIN_PASSWORD_LENGTH }) });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ ok: false, text: t('settings.passwordMismatch') });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(apiUrl('/me/password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (res.status === 403) {
        setPwMessage({ ok: false, text: t('settings.passwordWrongCurrent') });
        return;
      }
      if (!res.ok) {
        setPwMessage({ ok: false, text: t('settings.passwordError') });
        return;
      }
      setPwMessage({ ok: true, text: t('settings.passwordChanged') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPwMessage({ ok: false, text: t('settings.passwordError') });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <LobbyLayout>
      <main className={styles.page}>
        <h1 className={styles.title}>{t('settings.title')}</h1>

        {!ready ? (
          <p className={styles.muted}>{t('common.loading')}</p>
        ) : (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('settings.appearance')}</h2>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{t('theme.label')}</span>
                <ThemeSwitcher />
              </div>
              <label className={styles.hueControl}>
                <span>{t('settings.accentHue')}</span>
                <input
                  className={styles.hueSlider}
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={accentHue}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setAccentHue(next);
                    applyAccentHue(next);
                  }}
                />
                <span className={styles.muted}>{t('settings.accentHueHint')}</span>
              </label>
              <div className={styles.row}>
                <span className={styles.rowLabel}>{t('settings.language')}</span>
                <LanguageSwitcher />
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('settings.notifications')}</h2>
              <label className={styles.checkboxRow}>
                <input
                  className={switchStyles.toggle}
                  type="checkbox"
                  role="switch"
                  checked={showBadge}
                  onChange={(e) => toggleBadge(e.target.checked)}
                />
                <span>{t('settings.showUnreadBadge')}</span>
              </label>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('settings.changePassword')}</h2>
              <form className={styles.form} onSubmit={submitPassword}>
                <label className={styles.field}>
                  <span>{t('settings.currentPassword')}</span>
                  <input
                    className="text-input"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>{t('settings.newPassword')}</span>
                  <input
                    className="text-input"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className={styles.field}>
                  <span>{t('settings.confirmPassword')}</span>
                  <input
                    className="text-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                {pwMessage && (
                  <p className={pwMessage.ok ? styles.success : styles.error}>{pwMessage.text}</p>
                )}
                <button type="submit" className="button" disabled={pwSaving}>
                  {pwSaving ? t('common.saving') : t('settings.changePassword')}
                </button>
              </form>
            </section>
          </>
        )}
      </main>
    </LobbyLayout>
  );
}
