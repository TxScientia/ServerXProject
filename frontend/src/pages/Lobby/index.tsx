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
  status: string;
};

const PUBLIC_ASSET_BASE = process.env.PUBLIC_URL || '';
const CHARACTER_BACKGROUND_URL = `${PUBLIC_ASSET_BASE}/pictures/character-selection-background.webp`;
const NAV_ITEMS = ['Gesuche', 'OOC', 'PM', 'Einwohnerliste', 'Storybook', 'Guidebook', 'MyCharacter'];

const CharacterOverview = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', race: '', spec: '', gender: 'Männlich' });
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectCharacter = (char: Character) => {
    localStorage.setItem('characterId', char.id);
    localStorage.setItem('characterName', char.name);
    navigate('/storybooks');
  };

  const handleSave = () => {
    const token = localStorage.getItem('token');
    fetch(apiUrl('/characters'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        setShowModal(false);
        setForm({ name: '', race: '', spec: '', gender: 'Männlich' });
        fetchCharacters();
      })
      .catch(() => alert('Fehler beim Speichern'));
  };

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
      <div className={styles.actions}>
        <button onClick={() => setShowModal(true)} className={`button ${styles.plusButton}`}>+</button>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Charaktername</th>
            <th>Rasse</th>
            <th>Spezifikation</th>
            <th>Geschlecht</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((char, index) => (
            <tr
              key={index}
              className={styles.characterRow}
              onClick={() => handleSelectCharacter(char)}
              title="Als diesen Charakter spielen"
            >
              <td>{char.name}</td>
              <td>{char.race}</td>
              <td>{char.spec}</td>
              <td>{char.gender}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Neuen Charakter erstellen</h2>
            <label>
              Name:
              <input className="text-input" name="name" value={form.name} onChange={handleInputChange} />
            </label>
            <label>
              Rasse:
              <input className="text-input" name="race" value={form.race} onChange={handleInputChange} />
            </label>
            <label>
              Spezifikation:
              <input className="text-input" name="spec" value={form.spec} onChange={handleInputChange} />
            </label>
            <label>
              Geschlecht:
              <select className="select-input" name="gender" value={form.gender} onChange={handleInputChange}>
                <option value="Männlich">Männlich</option>
                <option value="Weiblich">Weiblich</option>
                <option value="Divers">Divers</option>
              </select>
            </label>
            <div className={styles.modalActions}>
              <button className="button" onClick={handleSave}>Speichern</button>
              <button className="button button--ghost" onClick={() => setShowModal(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterOverview;