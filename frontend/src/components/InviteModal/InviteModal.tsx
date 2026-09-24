import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalActions, ModalSpacer } from '../Modal';
import { apiUrl, authHeaders } from '../../api';
import styles from './InviteModal.module.css';

interface Item {
  id: string;
  name: string;
}

interface InviteModalProps {
  title: string;
  type: 'character' | 'plot';
  onClose: () => void;
  onSelect: (itemId: string) => void;
  excludeIds?: string[];
}

export default function InviteModal({
  title,
  type,
  onClose,
  onSelect,
  excludeIds = [],
}: InviteModalProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = type === 'character' ? '/residents' : '/storybooks';
    fetch(apiUrl(endpoint), { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        const filtered = data.filter((item: Item) => !excludeIds.includes(item.id));
        setItems(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type, excludeIds]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
    }
  };

  const placeholder = type === 'character' ? t('common.search') : 'Suchen...';

  return (
    <Modal title={title}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={styles.searchInput}
        autoFocus
      />

      <div className={styles.itemList}>
        {loading ? (
          <div className={styles.loading}>Laden...</div>
        ) : filteredItems.length === 0 ? (
          <div className={styles.empty}>Keine Ergebnisse</div>
        ) : (
          filteredItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.item} ${selectedId === item.id ? styles.selected : ''}`}
              onClick={() => setSelectedId(item.id)}
              type="button"
            >
              <input
                type="radio"
                name="invite-selection"
                checked={selectedId === item.id}
                readOnly
                className={styles.radio}
              />
              <span>{item.name}</span>
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
          onClick={handleConfirm}
          disabled={!selectedId}
          type="button"
        >
          Einladen
        </button>
      </ModalActions>
    </Modal>
  );
}
