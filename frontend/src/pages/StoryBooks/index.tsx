import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import styles from './StoryBooks.module.css';

type Storybook = {
  id: string;
  title: string;
  description: string | null;
  owner_character_id: string;
  created_at: string;
};

export default function StoryBooks() {
  const navigate = useNavigate();
  const [storybooks, setStorybooks] = useState<Storybook[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const characterName = localStorage.getItem('characterName');

  const fetchStorybooks = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    if (!localStorage.getItem('characterId')) {
      navigate('/characters');
      return;
    }
    fetch(apiUrl('/storybooks'), { headers: { ...authHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setStorybooks)
      .catch(() => setError('StoryBooks konnten nicht geladen werden.'));
  }, [navigate]);

  useEffect(() => {
    fetchStorybooks();
  }, [fetchStorybooks]);

  const handleCreate = () => {
    fetch(apiUrl('/storybooks'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...characterHeaders(),
      },
      body: JSON.stringify(form),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        setShowModal(false);
        setForm({ title: '', description: '' });
        fetchStorybooks();
      })
      .catch(() => alert('Fehler beim Erstellen'));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>StoryBooks</h1>
        <div className={styles.headerRight}>
          {characterName && <span className={styles.character}>als {characterName}</span>}
          <button className="button" onClick={() => setShowModal(true)}>
            + Neuer Plot
          </button>
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {storybooks.length === 0 ? (
        <p className={styles.empty}>Noch keine StoryBooks. Erstelle den ersten Plot!</p>
      ) : (
        <div className={styles.grid}>
          {storybooks.map((sb) => (
            <button
              key={sb.id}
              type="button"
              className={styles.card}
              onClick={() => navigate(`/storybooks/${sb.id}`)}
            >
              <h2 className={styles.cardTitle}>{sb.title}</h2>
              {sb.description && <p className={styles.cardDesc}>{sb.description}</p>}
            </button>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Neuen Plot erstellen</h2>
            <label>
              Titel:
              <input
                className="text-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Beschreibung:
              <textarea
                className="text-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className={styles.modalActions}>
              <button className="button" onClick={handleCreate} disabled={!form.title}>
                Erstellen
              </button>
              <button className="button button--ghost" onClick={() => setShowModal(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
