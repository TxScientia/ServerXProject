import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LobbyLayout from '../../pageLayouts/lobbyLayout/LobbyLayout';
import CharacterList, { Character } from '../../components/CharacterList';
import styles from './Lobby.module.css';
import { apiUrl, authHeaders, fetchAuthenticated } from '../../api';

export default function Lobby() {
  const { t } = useTranslation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyCharacterIds, setBusyCharacterIds] = useState<Set<string>>(new Set());
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
      .catch(() => alert(t('lobby.saveError')));
  };

  const setCharacterBusy = (id: string, busy: boolean) => {
    setBusyCharacterIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleFavorite = async (character: Character) => {
    setActionError(null);
    setCharacterBusy(character.id, true);
    try {
      const response = await fetchAuthenticated(apiUrl(`/characters/${character.id}/favorite`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ is_favorite: !character.isFavorite }),
      });
      if (!response.ok) throw new Error(t('lobby.favoriteError'));
      const updated = await response.json();
      setCharacters((current) => current.map((item) => item.id === character.id
        ? { ...item, isFavorite: updated.isFavorite } : item));
    } catch {
      setActionError(t('lobby.favoriteError'));
    } finally {
      setCharacterBusy(character.id, false);
    }
  };

  const deleteCharacter = async (character: Character) => {
    if (!window.confirm(t('lobby.deleteConfirm', { name: character.name }))) return;
    setActionError(null);
    setCharacterBusy(character.id, true);
    try {
      const response = await fetchAuthenticated(apiUrl(`/characters/${character.id}`), {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!response.ok) throw new Error(t(response.status === 409 ? 'lobby.deleteOwnedPlotError' : 'lobby.deleteError'));
      setCharacters((current) => current.filter((item) => item.id !== character.id));
      if (localStorage.getItem('characterId') === character.id) {
        localStorage.removeItem('characterId');
        localStorage.removeItem('characterName');
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('lobby.deleteError'));
    } finally {
      setCharacterBusy(character.id, false);
    }
  };

  const favoriteCharacters = characters.filter((character) => character.isFavorite);

  return (
    <LobbyLayout wide>
      <div className={styles.contentContainer}>
        <div className={styles.contentInner}>
          <h1 className={styles.heading}>{t('lobby.chooseCharacter')}</h1>
          <div className={styles.actions}>
            <button onClick={() => setShowModal(true)} className={`button ${styles.createButton}`}>
              {t('lobby.newCharacter')}
            </button>
          </div>

          {actionError && <p role="alert">{actionError}</p>}

          <section className={styles.favoritesSection} aria-labelledby="favorite-characters-heading">
            <h2 id="favorite-characters-heading" className={styles.sectionHeading}>
              {t('lobby.favoriteCharacters')}
            </h2>
            <CharacterList
              characters={favoriteCharacters}
              onSelect={enterServer}
              editorPageHref={(character) => `/characters/${character.id}/editor`}
              profilePageHref={(character) => `/characters/${character.id}/profile`}
              onToggleFavorite={toggleFavorite}
              onDelete={deleteCharacter}
              busyCharacterIds={busyCharacterIds}
            />
            {favoriteCharacters.length === 0 && <p>{t('lobby.noFavoriteCharacters')}</p>}
          </section>

          <CharacterList
            characters={characters}
            onSelect={enterServer}
            editorPageHref={(character) => `/characters/${character.id}/editor`}
            profilePageHref={(character) => `/characters/${character.id}/profile`}
            onToggleFavorite={toggleFavorite}
            onDelete={deleteCharacter}
            busyCharacterIds={busyCharacterIds}
          />
        </div>
      </div>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>{t('lobby.newCharacter')}</h2>
            <label>
              {t('lobby.name')}
              <input className="text-input" name="name" value={form.name} onChange={handleInputChange} />
            </label>
            <label>
              {t('lobby.race')}
              <input className="text-input" name="race" value={form.race} onChange={handleInputChange} />
            </label>
            <label>
              {t('lobby.spec')}
              <input className="text-input" name="spec" value={form.spec} onChange={handleInputChange} />
            </label>
            <label>
              {t('lobby.gender')}
              <select className="select-input" name="gender" value={form.gender} onChange={handleInputChange}>
                <option value="Männlich">{t('lobby.genderMale')}</option>
                <option value="Weiblich">{t('lobby.genderFemale')}</option>
                <option value="Divers">{t('lobby.genderDiverse')}</option>
              </select>
            </label>
            <div className={styles.modalActions}>
              <button className="button" onClick={handleSave}>{t('common.save')}</button>
              <button className="button button--ghost" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </LobbyLayout>
  );
}
