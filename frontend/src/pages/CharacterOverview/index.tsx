import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './CharacterOverview.module.css';
import { apiUrl } from '../../api';

type CharacterEditorData = {
  fullName: string;
  alias: string;
  species: string;
  specification: string;
  age: string;
  sexuality: string;
  relationshipStatus: string;
  profession: string;
  residence: string;
  origin: string;
  era: string;
  biography: string;
  imageSettings: string;
  colorCodes: string;
  characterText: string;
  abilities: string;
};

type Character = {
  id: string;
  name: string;
  race: string;
  spec: string;
  gender: string;
  status?: string;
  editorData?: Partial<CharacterEditorData>;
};

type CharacterForm = {
  name: string;
  race: string;
  spec: string;
  gender: string;
  editorData: CharacterEditorData;
};

const PUBLIC_ASSET_BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const CHARACTER_BACKGROUND_URL = `${PUBLIC_ASSET_BASE}/pictures/rosesbackgroundWWC.webp`;
const NAV_ITEMS = ['Gesuche', 'OOC', 'PM', 'Einwohnerliste', 'Storybook', 'Guidebook', 'MyCharacter'];

const emptyEditorData: CharacterEditorData = {
  fullName: '',
  alias: '',
  species: '',
  specification: '',
  age: '',
  sexuality: '',
  relationshipStatus: '',
  profession: '',
  residence: '',
  origin: '',
  era: '',
  biography: '',
  imageSettings: '',
  colorCodes: '',
  characterText: '',
  abilities: '',
};

const createEmptyForm = (): CharacterForm => ({
  name: '',
  race: '',
  spec: '',
  gender: 'Männlich',
  editorData: { ...emptyEditorData },
});

const mergeEditorData = (data?: Partial<CharacterEditorData>): CharacterEditorData => ({
  ...emptyEditorData,
  ...(data || {}),
});

const CharacterOverview = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'charId' | 'character' | 'abilities'>('charId');
  const [form, setForm] = useState<CharacterForm>(createEmptyForm);
  const navigate = useNavigate();

  const isEditing = useMemo(() => Boolean(editingCharacterId), [editingCharacterId]);

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

  const openCreateEditor = () => {
    setEditingCharacterId(null);
    setForm(createEmptyForm());
    setActiveTab('charId');
    setIsEditorOpen(true);
  };

  const openEditEditor = (character: Character) => {
    const editorData = mergeEditorData(character.editorData);
    setEditingCharacterId(character.id);
    setForm({
      name: character.name,
      race: character.race,
      spec: character.spec,
      gender: character.gender,
      editorData: {
        ...editorData,
        alias: editorData.alias || (editorData as Partial<CharacterEditorData> & { displayName?: string }).displayName || character.name,
        species: editorData.species || character.race,
        specification: editorData.specification || character.spec,
      },
    });
    setActiveTab('charId');
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingCharacterId(null);
    setForm(createEmptyForm());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleEditorDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((currentForm) => {
      const nextEditorData = { ...currentForm.editorData, [name]: value };
      return {
        ...currentForm,
        name: name === 'alias' || (name === 'fullName' && !currentForm.editorData.alias) ? value : currentForm.name,
        race: name === 'species' ? value : currentForm.race,
        spec: name === 'specification' ? value : currentForm.spec,
        editorData: nextEditorData,
      };
    });
  };

  const handleSave = () => {
    const token = localStorage.getItem('token');
    const editorData = {
      ...form.editorData,
      alias: form.editorData.alias || form.name,
      species: form.editorData.species || form.race,
      specification: form.editorData.specification || form.spec,
    };
    const payload = {
      ...form,
      name: form.name || editorData.alias || editorData.fullName,
      race: form.race || editorData.species,
      spec: form.spec || editorData.specification,
      editorData,
    };

    fetch(apiUrl(isEditing ? `/characters/${editingCharacterId}` : '/characters'), {
      method: isEditing ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(() => {
        closeEditor();
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
        <button onClick={openCreateEditor} className={`button ${styles.plusButton}`} aria-label="Neuen Charakter erstellen">+</button>
      </div>
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
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => openEditEditor(char)}
                  aria-label={`${char.name} bearbeiten`}
                  title="Charakter bearbeiten"
                >
                  📝
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isEditorOpen && (
        <div className={styles.editorOverlay} role="dialog" aria-modal="true" aria-label="Charaktereditor">
          <div className={styles.editorPanel}>
            <aside className={styles.editorSidebar}>
              <h2>Charakter</h2>
              <button type="button" className={activeTab === 'charId' ? styles.sideItemActive : styles.sideItem} onClick={() => setActiveTab('charId')}>Steckbrief</button>
              <button type="button" className={activeTab === 'character' ? styles.sideItemActive : styles.sideItem} onClick={() => setActiveTab('character')}>Biografie</button>
              <button type="button" className={activeTab === 'character' ? styles.sideItemActive : styles.sideItem} onClick={() => setActiveTab('character')}>Bildeinstellungen</button>
              <button type="button" className={activeTab === 'abilities' ? styles.sideItemActive : styles.sideItem} onClick={() => setActiveTab('abilities')}>Farbcodes</button>
            </aside>

            <section className={styles.editorMain}>
              <div className={styles.editorTabs}>
                <button type="button" className={activeTab === 'charId' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('charId')}>Char ID</button>
                <button type="button" className={activeTab === 'character' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('character')}>Character</button>
                <button type="button" className={activeTab === 'abilities' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('abilities')}>Abilities</button>
              </div>

              {activeTab === 'charId' && (
                <div className={styles.formGrid}>
                  <label>
                    <span>Vollständiger Name</span>
                    <input name="fullName" value={form.editorData.fullName} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Alias</span>
                    <input name="alias" value={form.editorData.alias} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Spezies</span>
                    <input name="species" value={form.editorData.species} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Spezifikation</span>
                    <input name="specification" value={form.editorData.specification} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Alter</span>
                    <input name="age" value={form.editorData.age} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Geschlecht</span>
                    <select name="gender" value={form.gender} onChange={handleInputChange}>
                      <option value="Männlich">Männlich</option>
                      <option value="Weiblich">Weiblich</option>
                      <option value="Divers">Divers</option>
                    </select>
                  </label>
                  <label>
                    <span>Sexualität</span>
                    <input name="sexuality" value={form.editorData.sexuality} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Beziehungsstand</span>
                    <input name="relationshipStatus" value={form.editorData.relationshipStatus} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Beruf</span>
                    <input name="profession" value={form.editorData.profession} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Wohnsitz</span>
                    <input name="residence" value={form.editorData.residence} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Herkunft</span>
                    <input name="origin" value={form.editorData.origin} onChange={handleEditorDataChange} />
                  </label>
                  <label>
                    <span>Zeitalter</span>
                    <input name="era" value={form.editorData.era} onChange={handleEditorDataChange} />
                  </label>
                </div>
              )}

              {activeTab === 'character' && (
                <div className={styles.formGrid}>
                  <label className={styles.fullWidth}>
                    <span>Biografie</span>
                    <textarea name="biography" rows={8} value={form.editorData.biography} onChange={handleEditorDataChange} />
                  </label>
                  <label className={styles.fullWidth}>
                    <span>Bildeinstellungen</span>
                    <textarea name="imageSettings" rows={5} value={form.editorData.imageSettings} onChange={handleEditorDataChange} />
                  </label>
                  <label className={styles.fullWidth}>
                    <span>Character</span>
                    <textarea name="characterText" rows={6} value={form.editorData.characterText} onChange={handleEditorDataChange} />
                  </label>
                </div>
              )}

              {activeTab === 'abilities' && (
                <div className={styles.formGrid}>
                  <label className={styles.fullWidth}>
                    <span>Abilities</span>
                    <textarea name="abilities" rows={8} value={form.editorData.abilities} onChange={handleEditorDataChange} />
                  </label>
                  <label className={styles.fullWidth}>
                    <span>Farbcodes</span>
                    <textarea name="colorCodes" rows={6} value={form.editorData.colorCodes} onChange={handleEditorDataChange} />
                  </label>
                </div>
              )}

              <div className={styles.editorActions}>
                <button className="button" onClick={handleSave}>Speichern</button>
                <button className="button button--ghost" onClick={closeEditor}>Abbrechen</button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterOverview;
