import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import styles from './StoryBookDetail.module.css';

type Place = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  parent_place_id: string | null;
  created_at: string;
};

type Storybook = {
  id: string;
  title: string;
  description: string | null;
  owner_character_id: string;
  created_at: string;
  places: Place[];
};

// Plot-scoped nav items from the wireframe — placeholders until built.
const PLOT_NAV = ['OOC-Chat', 'News', 'Home', 'Gesuche', 'Mitglieder', 'Plot Settings'];

function PlaceNode({ place, allPlaces }: { place: Place; allPlaces: Place[] }) {
  const children = allPlaces.filter((p) => p.parent_place_id === place.id);
  return (
    <li>
      <span className={styles.placeTitle}>{place.title}</span>
      {children.length > 0 && (
        <ul className={styles.placeChildren}>
          {children.map((child) => (
            <PlaceNode key={child.id} place={child} allPlaces={allPlaces} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function StoryBookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [storybook, setStorybook] = useState<Storybook | null>(null);
  const [newPlace, setNewPlace] = useState({ title: '', parent_place_id: '' });
  const [error, setError] = useState<string | null>(null);

  const fetchStorybook = useCallback(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
      return;
    }
    fetch(apiUrl(`/storybooks/${id}`), { headers: { ...authHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setStorybook)
      .catch(() => setError('StoryBook konnte nicht geladen werden.'));
  }, [id, navigate]);

  useEffect(() => {
    fetchStorybook();
  }, [fetchStorybook]);

  const handleAddPlace = () => {
    fetch(apiUrl(`/storybooks/${id}/places`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...characterHeaders(),
      },
      body: JSON.stringify({
        title: newPlace.title,
        parent_place_id: newPlace.parent_place_id || null,
      }),
    })
      .then((res) => {
        if (res.status === 403) throw new Error('Nur Admins dieses Plots dürfen Orte anlegen.');
        if (!res.ok) throw new Error('Fehler beim Anlegen des Ortes.');
        return res.json();
      })
      .then(() => {
        setNewPlace({ title: '', parent_place_id: '' });
        setError(null);
        fetchStorybook();
      })
      .catch((e) => setError(e.message));
  };

  const topLevel = storybook?.places.filter((p) => !p.parent_place_id) ?? [];

  const leftNav = (
    <div className={styles.sideNav}>
      <button className={styles.backItem} onClick={() => navigate('/storybooks')}>
        ← StoryBooks
      </button>
      <div className={styles.sideTitle}>{storybook?.title ?? 'Plot'}</div>

      {PLOT_NAV.map((item) => (
        <button key={item} className={styles.sideItem} disabled title="Bald verfügbar">
          {item}
        </button>
      ))}

      <hr className={styles.divider} />

      <div className={styles.filterTitle}>Orte</div>
      {topLevel.length === 0 ? (
        <p className={styles.muted}>Noch keine Orte.</p>
      ) : (
        <ul className={styles.placeTree}>
          {topLevel.map((p) => (
            <PlaceNode key={p.id} place={p} allPlaces={storybook!.places} />
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <AppLayout leftNav={leftNav}>
      {!storybook ? (
        <p className={error ? styles.error : undefined}>{error ?? 'Lädt…'}</p>
      ) : (
        <>
          <h1 className={styles.title}>{storybook.title}</h1>
          {storybook.description && <p className={styles.desc}>{storybook.description}</p>}

          <section className={styles.addSection}>
            <h2 className={styles.sectionTitle}>Ort hinzufügen</h2>
            <div className={styles.addPlace}>
              <input
                className="text-input"
                placeholder="Neuer Ort"
                value={newPlace.title}
                onChange={(e) => setNewPlace({ ...newPlace, title: e.target.value })}
              />
              <select
                className="select-input"
                value={newPlace.parent_place_id}
                onChange={(e) => setNewPlace({ ...newPlace, parent_place_id: e.target.value })}
              >
                <option value="">— Oberort (keiner) —</option>
                {storybook.places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <button className="button" onClick={handleAddPlace} disabled={!newPlace.title}>
                Ort hinzufügen
              </button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
          </section>
        </>
      )}
    </AppLayout>
  );
}
