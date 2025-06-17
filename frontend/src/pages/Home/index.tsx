import React, { useState } from 'react';
import styles from './Home.module.css';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Hier kommt später dein API-Login – aktuell nur Dummy-Check
    if (username === 'test' && password === '1234') {
      console.log('Login erfolgreich!');

      // ⏩ Weiterleitung zur Charakterübersicht
      navigate('/characters');
    } else {
      alert('Login fehlgeschlagen');
    }
  };

  return (
    <div className={styles.container}>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <label>
          Benutzername:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <br />
        <label>
          Passwort:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <br />
        <button type="submit">Einloggen</button>
      </form>
    </div>
  );
}