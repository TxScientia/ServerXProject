import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiUrl, authHeaders } from '../../api';
import styles from './CharacterProfile.module.css';

type EditorData = {
  displayName?: string;
  fullName?: string;
  species?: string;
  specification?: string;
  age?: string;
  sexuality?: string;
  relationshipStatus?: string;
  profession?: string;
  residence?: string;
  origin?: string;
  era?: string;
  frameImageUrl?: string;
  portraitImageUrl?: string;
  headerBackgroundUrl?: string;
  customFields?: string[];
};

type Character = {
  id: string;
  name: string;
  race: string;
  spec: string;
  gender: string;
  editorData?: EditorData;
};

const NAV_ITEMS = ['Biografie', 'Character', 'Abilities', 'Socials', 'Gesuche', 'Diary', 'OOC'];
const PUBLIC_ASSET_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const FALLBACK_BACKGROUND_URL = `${PUBLIC_ASSET_BASE}/pictures/rosesbackgroundWWC.webp`;

const pairFields = (fields: string[] = []) => {
  const pairs: Array<{ label: string; value: string }> = [];
  for (let index = 0; index < fields.length; index += 2) {
    if (fields[index] || fields[index + 1]) {
      pairs.push({ label: fields[index] || 'Wissenswertes', value: fields[index + 1] || '' });
    }
  }
  return pairs;
};

export default function CharacterProfile() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [error, setError] = useState<string | null>(null);

  const character = useMemo(
    () => characters.find((item) => item.id === characterId),
    [characterId, characters],
  );

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
      .catch(() => setError('Charakterprofil konnte nicht geladen werden.'));
  }, [navigate]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  if (error) return <div className={styles.status}>{error}</div>;
  if (!character) return <div className={styles.status}>Lade Charakterprofil…</div>;

  const data = character.editorData || {};
  const customPairs = pairFields(data.customFields);
  const backgroundUrl = data.headerBackgroundUrl || FALLBACK_BACKGROUND_URL;

  const facts = [
    ['Name', data.fullName || character.name],
    ['Alias/Spitzname', data.displayName || character.name],
    ['Spezies', data.species || character.race],
    ['Spezifikation', data.specification || character.spec],
    ['Alter', data.age || ''],
    ['Geschlecht', character.gender],
    ['Sexualität', data.sexuality || ''],
    ['Beziehungsstand', data.relationshipStatus || ''],
    ['Beruf', data.profession || ''],
    ['Wohnsitz', data.residence || ''],
    ['Herkunft', data.origin || ''],
    ['Zeitalter', data.era || ''],
  ];

  return (
    <main className={styles.page} style={{ '--profile-bg-image': `url(${backgroundUrl})` } as React.CSSProperties}>
      <section className={styles.profile}>
        <nav className={styles.nav} aria-label="Profilnavigation">
          {NAV_ITEMS.map((item) => <button key={item} type="button">{item}</button>)}
        </nav>
        <div className={styles.topPicture} aria-hidden="true" />

        <div className={styles.hero}>
          <aside className={styles.windowFrame}>
            {data.frameImageUrl && <img src={data.frameImageUrl} alt="Linkes Profilbild" />}
          </aside>

          <article className={styles.card}>
            <div className={styles.factGrid}>
              {facts.map(([label, value]) => (
                <div key={label} className={styles.fact}>
                  <h2>{label}</h2>
                  <p>{value || '—'}</p>
                </div>
              ))}
            </div>

            <div className={styles.portraitFrame}>
              {data.portraitImageUrl && <img src={data.portraitImageUrl} alt={`${character.name} Profilbild`} />}
            </div>

            <section className={styles.plotSection}>
              <h2>Plotspezifisches</h2>
              <div><strong>Plotzugehörigkeit:</strong> #Eden Fall #M.O.R.A.</div>
              <div><strong>Titel</strong></div>
              <div><strong>Rang</strong></div>
              <div><strong>Fraktion</strong></div>
            </section>

            <section className={styles.knowledge}>
              <header><h2>Wissenswertes</h2><span /></header>
              <div className={styles.customGrid}>
                {customPairs.length ? customPairs.map((pair, index) => (
                  <div key={`${pair.label}-${index}`} className={styles.fact}>
                    <h2>{pair.label}</h2>
                    <p>{pair.value || '—'}</p>
                  </div>
                )) : <p className={styles.empty}>Keine zusätzlichen Char-ID-Einträge vorhanden.</p>}
              </div>
            </section>
          </article>
        </div>
      </section>
    </main>
  );
}
