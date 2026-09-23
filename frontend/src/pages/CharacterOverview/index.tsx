import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CharacterOverview.module.css';
import { apiUrl } from '../../api';

type Character = {
  id: string;
  name: string;
  race: string;
  spec: string;
  gender: string;
  status?: string;
};

const PUBLIC_ASSET_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const CHARACTER_BACKGROUND_URL = `${PUBLIC_ASSET_BASE}/pictures/rosesbackgroundWWC.webp`;
const NAV_ITEMS = ['Gesuche', 'OOC', 'PM', 'Einwohnerliste', 'Storybook', 'Guidebook', 'MyCharacter'];

const CharacterOverview = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const navigate = useNavigate();

  const fetchCharacters = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    fetch(apiUrl('/characters'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setCharacters(data))
      .catch(() => navigate('/'));
  }, [navigate]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  return (
    <div
      className={styles.container}
      style={{ '--character-background-image': `url(${CHARACTER_BACKGROUND_URL})` } as React.CSSProperties}
    >
      <nav className={styles.topNav} aria-label="Character navigation">
        {NAV_ITEMS.map((item) => (
          <button key={item} type="button" className={styles.navItem}>
            {item}
          </button>
        ))}
      </nav>

      <h1>Charakterübersicht</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Charaktername</th>
            <th>Rasse</th>
            <th>Spezifikation</th>
            <th>Geschlecht</th>
            <th>Bearbeiten</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((char) => (
            <tr key={char.id}>
              <td>{char.name}</td>
              <td>{char.race}</td>
              <td>{char.spec}</td>
              <td>{char.gender}</td>
              <td>
                <a
                  className={styles.editButton}
                  href={`/characters/${char.id}/editor`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${char.name} in neuem Tab bearbeiten`}
                  title="Editor in neuem Tab öffnen"
                >
                  ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CharacterOverview;
