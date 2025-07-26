import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CharacterOverview.module.css';

type Character = {
  name: string;
  race: string;
  spec: string;
  gender: string;
  status: string;
};

const CharacterOverview = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', race: '', spec: '', gender: 'Männlich' });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    fetch('http://localhost:8000/characters', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => setCharacters(data))
      .catch(() => navigate('/'));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:8000/characters', {
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
    <div className={styles.container}>
      <h1>Charakterübersicht</h1>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={() => setShowModal(true)} className={styles.plusButton}>+</button>
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
            <tr key={index}>
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
              <input name="name" value={form.name} onChange={handleInputChange} />
            </label>
            <label>
              Rasse:
              <input name="race" value={form.race} onChange={handleInputChange} />
            </label>
            <label>
              Spezifikation:
              <input name="spec" value={form.spec} onChange={handleInputChange} />
            </label>
            <label>
              Geschlecht:
              <select name="gender" value={form.gender} onChange={handleInputChange}>
                <option value="Männlich">Männlich</option>
                <option value="Weiblich">Weiblich</option>
                <option value="Divers">Divers</option>
              </select>
            </label>
            <div style={{ marginTop: 10 }}>
              <button onClick={handleSave}>Speichern</button>
              <button onClick={() => setShowModal(false)} style={{ marginLeft: 10 }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterOverview;