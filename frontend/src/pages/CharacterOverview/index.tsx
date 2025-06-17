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
  const navigate = useNavigate();

  useEffect(() => {
    /*const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }*/

    // Beispiel-Daten – später durch echten API-Call ersetzen
    setCharacters([
      { name: 'Arthas', race: 'Mensch', spec: 'Paladin', gender: 'Männlich', status: 'Aktiv' },
      { name: 'Sylvanas', race: 'Untote', spec: 'Jägerin', gender: 'Weiblich', status: 'Offline' },
    ]);

    // Beispiel für echten API-Call:
    /*
    fetch('http://localhost:8000/characters', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setCharacters(data))
      .catch(() => navigate('/'));
    */
  }, []);

  return (
    <div className={styles.container}>
      <h1>Charakterübersicht</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Charaktername</th>
            <th>Rasse</th>
            <th>Spezifikation</th>
            <th>Geschlecht</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((char, index) => (
            <tr key={index}>
              <td>{char.name}</td>
              <td>{char.race}</td>
              <td>{char.spec}</td>
              <td>{char.gender}</td>
              <td>{char.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CharacterOverview;