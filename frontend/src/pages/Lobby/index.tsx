import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LobbyLayout from '../../pageLayouts/lobbyLayout/LobbyLayout';
import CharacterList, { Character } from '../../components/CharacterList';
import styles from './Lobby.module.css';
import { apiUrl, authHeaders } from '../../api';

export default function Lobby() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', race: '', spec: '', gender: 'Männlich' });
  const navigate = useNavigate();

  const fetchCharacters = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    fetch(apiUrl('/characters'), { headers: { ...authHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setCharacters)
      .catch(() => navigate('/'));
  }, [navigate]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const enterServer = (char: Character) => {
    localStorage.setItem('characterId', char.id);
    localStorage.setItem('characterName', char.name);
    navigate('/residents');
  };

  const handleSave = () => {
    fetch(apiUrl('/characters'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
    <LobbyLayout>
      <h1 className={styles.heading}>Wähle deinen Charakter</h1>
      <p className={styles.subheading}>Wähle einen Charakter, um die Welt zu betreten.</p>
      <div className={styles.actions}>
        <button onClick={() => setShowModal(true)} className={`button ${styles.plusButton}`}>+</button>
      </div>

      <CharacterList characters={characters} onSelect={enterServer} />

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
    </LobbyLayout>
  );
}
