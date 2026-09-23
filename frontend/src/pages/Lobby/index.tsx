import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LobbyLayout from '../../pageLayouts/lobbyLayout/LobbyLayout';
import CharacterList, { Character } from '../../components/CharacterList';
import styles from './Lobby.module.css';
import { apiUrl, authHeaders } from '../../api';

export default function Lobby() {
  const { t } = useTranslation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', race: '', spec: '', gender: 'Männlich' });
  const [pmUnreadCount, setPmUnreadCount] = useState(0);
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

  const fetchPmUnreadCount = useCallback(() => {
    fetch(apiUrl('/pm/chats'), { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((chats: any[]) => {
        const total = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
        setPmUnreadCount(total);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCharacters();
    fetchPmUnreadCount();
  }, [fetchCharacters, fetchPmUnreadCount]);

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

  return (
    <LobbyLayout pmUnreadCount={pmUnreadCount}>
      <h1 className={styles.heading}>{t('lobby.chooseCharacter')}</h1>
      <p className={styles.subheading}>{t('lobby.chooseCharacterSub')}</p>
      <div className={styles.actions}>
        <button onClick={() => setShowModal(true)} className={`button ${styles.plusButton}`}>+</button>
      </div>

      <CharacterList characters={characters} onSelect={enterServer} />

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
