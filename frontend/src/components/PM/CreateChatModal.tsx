import { useEffect, useId, useRef, useState } from 'react';
import { Modal, ModalActions, ModalSpacer } from '../Modal';
import { apiUrl, authHeaders } from '../../api';
import styles from './CreateChatModal.module.css';

const NO_EXCLUSIONS: string[] = [];

interface Character {
  id: string;
  name: string;
}

interface CreateChatModalProps {
  onClose: () => void;
  onCreateDirect: (characterId: string, creatorCharacterId: string, name?: string) => void;
  onCreateGroup: (characterIds: string[], name: string, creatorCharacterId: string) => void;
  excludeCharacterIds?: string[];
  accountCharacters?: Character[];
}

export default function CreateChatModal({
  onClose,
  onCreateDirect,
  onCreateGroup,
  excludeCharacterIds = NO_EXCLUSIONS,
  accountCharacters = [],
}: CreateChatModalProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [chatName, setChatName] = useState('');
  const [creatorCharacterId, setCreatorCharacterId] = useState<string>(accountCharacters[0]?.id || '');
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const recipientId = useId();
  const resultsId = `${recipientId}-results`;

  // accountCharacters may arrive after this modal mounts (the parent fetches it async).
  // Keep the acting-character id in sync so it's never left empty — otherwise the create
  // request would send an empty X-Character-Id (422) or the button would silently no-op.
  useEffect(() => {
    if (!creatorCharacterId && accountCharacters.length > 0) {
      setCreatorCharacterId(accountCharacters[0].id);
    }
  }, [accountCharacters, creatorCharacterId]);

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
    !selectedIds.includes(c.id) && c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleSelectCharacter = (charId: string) => {
    setSelectedIds((ids) => ids.includes(charId) ? ids : [...ids, charId]);
    setSearchQuery('');
    setActiveIndex(-1);
    searchRef.current?.focus();
  };

  const handleRemoveSelected = (charId: string) => {
    setSelectedIds((ids) => ids.filter((id) => id !== charId));
    setActiveIndex(-1);
    searchRef.current?.focus();
  };

  const handleCreate = () => {
    if (selectedIds.length === 0 || !creatorCharacterId) return;

    if (selectedIds.length === 1) {
      onCreateDirect(selectedIds[0], creatorCharacterId, chatName.trim() || undefined);
    } else {
      const name = chatName.trim() || selectedIds.map((id) => characters.find((c) => c.id === id)?.name).join(', ');
      onCreateGroup(selectedIds, name, creatorCharacterId);
    }
  };

  const selectedCharacters = selectedIds.map((id) => characters.find((c) => c.id === id)).filter(Boolean) as Character[];

  return (
    <Modal title="Neuer Chat" className={styles.createChatModal}>
      {accountCharacters.length > 1 && (
        <div className={styles.creatorSection}>
          <label className={styles.label}>Mit welchem Charakter?</label>
          <select
            value={creatorCharacterId}
            onChange={(e) => setCreatorCharacterId(e.target.value)}
            className={styles.creatorSelect}
          >
            {accountCharacters.map((char) => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={styles.label} htmlFor={recipientId}>An</label>
        <div className={styles.recipientField}>
          {selectedCharacters.map((char) => (
            <div key={char.id} className={styles.chip}>
              <span>{char.name}</span>
              <button
                className={styles.removeBtn}
                onClick={() => handleRemoveSelected(char.id)}
                aria-label={`${char.name} entfernen`}
                title="Entfernen"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
          <input
            ref={searchRef}
            id={recipientId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-controls={resultsId}
            aria-activedescendant={activeIndex >= 0 && filteredCharacters[activeIndex] ? `${resultsId}-${activeIndex}` : undefined}
            autoComplete="off"
            placeholder={selectedIds.length ? 'Weitere Empfänger hinzufügen...' : 'Empfänger suchen...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={(e) => {
              if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && filteredCharacters.length) {
                e.preventDefault();
                setActiveIndex((index) => e.key === 'ArrowDown'
                  ? (index + 1) % filteredCharacters.length
                  : (index <= 0 ? filteredCharacters.length - 1 : index - 1));
              } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                const recipient = filteredCharacters[activeIndex < 0 ? 0 : activeIndex];
                if (recipient) handleSelectCharacter(recipient.id);
              } else if (e.key === 'Backspace' && !searchQuery && selectedIds.length && !e.repeat) {
                e.preventDefault();
                handleRemoveSelected(selectedIds[selectedIds.length - 1]);
              }
            }}
            className={styles.searchInput}
            autoFocus
          />
        </div>
      </div>

      <div>
        <label className={styles.label} htmlFor={`${recipientId}-name`}>Chatname (optional)</label>
        <input
          id={`${recipientId}-name`}
          type="text"
          placeholder="Chatname (optional)"
          maxLength={120}
          value={chatName}
          onChange={(e) => setChatName(e.target.value)}
          className={styles.groupNameInput}
        />
      </div>

      <div id={resultsId} className={styles.characterList} role="listbox" aria-label="Empfänger">
        {loading ? (
          <div className={styles.loading}>Laden...</div>
        ) : filteredCharacters.length === 0 ? (
          <div className={styles.empty}>Keine Ergebnisse</div>
        ) : (
          filteredCharacters.map((char, index) => (
            <button
              key={char.id}
              id={`${resultsId}-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              tabIndex={-1}
              className={`${styles.charItem} ${activeIndex === index ? styles.selected : ''}`}
              onMouseDown={(e) => e.preventDefault()}
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
          Abbrechen
        </button>
        <ModalSpacer />
        <button
          className="button"
          onClick={handleCreate}
          disabled={selectedIds.length === 0 || !creatorCharacterId}
          type="button"
        >
          Erstellen
        </button>
      </ModalActions>
    </Modal>
  );
}
