import React, { useState } from 'react';
import styles from './Home.module.css';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const response = await fetch('http://localhost:8000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login_name: username,
        password: password,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token); // Token speichern
      navigate('/characters');
    } else {
      alert('Login fehlgeschlagen');
    }
  } catch (error) {
    alert('Fehler beim Login');
    console.error(error);
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