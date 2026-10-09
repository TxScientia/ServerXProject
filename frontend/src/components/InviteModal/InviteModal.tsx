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
  /** Called with all selected ids — multiple can be invited at once. */
  onSelect: (itemIds: string[]) => void;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = type === 'character' ? '/residents' : '/storybooks';
    fetch(apiUrl(endpoint), { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        // Plots expose `title`; characters expose `name`. Normalize to `name` for display.
        const normalized: Item[] = data.map((item: any) => ({
          id: String(item.id),
          name: item.name ?? item.title ?? '',
        }));
        setItems(normalized.filter((item) => !excludeIds.includes(item.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type, excludeIds]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggle = (itemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]
    );
  };

  const handleConfirm = () => {
    if (selectedIds.length > 0) {
      onSelect(selectedIds);
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
              className={`${styles.item} ${selectedIds.includes(item.id) ? styles.selected : ''}`}
              onClick={() => toggle(item.id)}
              type="button"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
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
          disabled={selectedIds.length === 0}
          type="button"
        >
          {selectedIds.length > 1 ? `Einladen (${selectedIds.length})` : 'Einladen'}
        </button>
      </ModalActions>
    </Modal>
  );
}
