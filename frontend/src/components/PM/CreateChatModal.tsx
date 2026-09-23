import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalActions, ModalSpacer } from '../Modal';
import { apiUrl, authHeaders } from '../../api';
import styles from './CreateChatModal.module.css';

interface Character {
  id: string;
  name: string;
}

interface CreateChatModalProps {
  onClose: () => void;
  onCreateDirect: (characterId: string) => void;
  onCreateGroup: (characterIds: string[], name: string) => void;
  excludeCharacterIds?: string[];
}

export default function CreateChatModal({
  onClose,
  onCreateDirect,
  onCreateGroup,
  excludeCharacterIds = [],
}: CreateChatModalProps) {
  const { t } = useTranslation();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('/residents'), { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        const filtered = data.filter((c: Character) => !excludeCharacterIds.includes(c.id));
        setCharacters(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [excludeCharacterIds]);

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCharacter = (charId: string) => {
    if (selectedIds.includes(charId)) {
      setSelectedIds(selectedIds.filter((id) => id !== charId));
    } else {
      setSelectedIds([...selectedIds, charId]);
    }
  };

  const handleRemoveSelected = (charId: string) => {
    setSelectedIds(selectedIds.filter((id) => id !== charId));
  };

  const handleCreate = () => {
    if (selectedIds.length === 0) return;

    if (selectedIds.length === 1) {
      onCreateDirect(selectedIds[0]);
    } else {
      const name = groupName.trim() || selectedIds.map((id) => characters.find((c) => c.id === id)?.name).join(', ');
      onCreateGroup(selectedIds, name);
    }
  };

  const selectedCharacters = selectedIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean) as Character[];

  return (
    <Modal title={t('pm.createChat') || 'Neuer Chat'}>
      <div className={styles.selectedChars}>
        {selectedCharacters.map((char) => (
          <div key={char.id} className={styles.chip}>
            <span>{char.name}</span>
            <button
              className={styles.removeBtn}
              onClick={() => handleRemoveSelected(char.id)}
              title="Entfernen"
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <input
        type="text"
        placeholder={t('common.search') || 'Suchen...'}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={styles.searchInput}
        autoFocus
      />

      {selectedIds.length > 1 && (
        <input
          type="text"
          placeholder={t('pm.groupName') || 'Gruppenname (optional)'}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className={styles.groupNameInput}
        />
      )}

      <div className={styles.characterList}>
        {loading ? (
          <div className={styles.loading}>{t('common.loading')}</div>
        ) : filteredCharacters.length === 0 ? (
          <div className={styles.empty}>{t('common.noResults')}</div>
        ) : (
          filteredCharacters.map((char) => (
            <button
              key={char.id}
              className={`${styles.charItem} ${selectedIds.includes(char.id) ? styles.selected : ''}`}
              onClick={() => handleSelectCharacter(char.id)}
              type="button"
            >
              <span>{char.name}</span>
            </button>
          ))
        )}
      </div>

      <ModalActions>
        <button className="button button--ghost" onClick={onClose} type="button">
          {t('common.cancel')}
        </button>
        <ModalSpacer />
        <button
          className="button"
          onClick={handleCreate}
          disabled={selectedIds.length === 0}
          type="button"
        >
          Erstellen
        </button>
      </ModalActions>
    </Modal>
  );
}
