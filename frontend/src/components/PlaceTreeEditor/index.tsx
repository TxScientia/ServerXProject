import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import { Modal, ModalActions, ModalSpacer } from '../Modal';
import styles from './PlaceTreeEditor.module.css';

export type Place = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  parent_place_id: string | null;
  created_at: string;
};

type Props = {
  storybookId: string;
  places: Place[];
  onChanged: () => void; // re-fetch the storybook/places after a mutation
};

function editHeaders() {
  return { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() };
}

export default function PlaceTreeEditor({ storybookId, places, onChanged }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Place | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const api = (path: string, method: string, body?: unknown) =>
    fetch(apiUrl(`/storybooks/${storybookId}${path}`), {
      method,
      headers: editHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

  const siblingsOf = (parentId: string | null) =>
    places
      .filter((p) => p.parent_place_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  const addPlace = async (parentId: string | null) => {
    // Auto-name; the user renames inline afterwards. "Ort" is stored data (stays German).
    await api('/places', 'POST', { title: `Ort ${places.length + 1}`, parent_place_id: parentId });
    onChanged();
  };

  const startRename = (p: Place) => {
    setRenamingId(p.id);
    setRenameValue(p.title);
  };

  const commitRename = async (p: Place) => {
    const value = renameValue.trim();
    setRenamingId(null);
    if (value && value !== p.title) {
      await api(`/places/${p.id}`, 'PATCH', { title: value });
      onChanged();
    }
  };

  const move = async (p: Place, dir: -1 | 1) => {
    const sibs = siblingsOf(p.parent_place_id);
    const idx = sibs.findIndex((s) => s.id === p.id);
    const target = idx + dir;
    if (target < 0 || target >= sibs.length) return;
    const reordered = [...sibs];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    await api('/places/reorder', 'POST', { ordered_ids: reordered.map((s) => s.id) });
    onChanged();
  };

  const saveEdit = async () => {
    if (!editing) return;
    await api(`/places/${editing.id}`, 'PATCH', {
      title: editing.title,
      description: editing.description,
      image_url: editing.image_url,
    });
    setEditing(null);
    onChanged();
  };

  const deleteEditing = async () => {
    if (!editing) return;
    if (!window.confirm(t('plotSettings.deleteConfirm'))) return;
    await api(`/places/${editing.id}`, 'DELETE');
    setEditing(null);
    onChanged();
  };

  const renderNodes = (parentId: string | null, depth: number) => {
    const sibs = siblingsOf(parentId);
    return sibs.map((p, i) => (
      <li key={p.id}>
        <div className={styles.node} style={{ marginLeft: `${depth * 1.25}rem` }}>
          {renamingId === p.id ? (
            <input
              autoFocus
              className={`text-input ${styles.renameInput}`}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={() => commitRename(p)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(p);
                if (e.key === 'Escape') setRenamingId(null);
              }}
            />
          ) : (
            <button type="button" className={styles.name} onClick={() => startRename(p)}>
              {p.title}
            </button>
          )}
          <span className={styles.actions}>
            <button type="button" onClick={() => move(p, -1)} disabled={i === 0} title={t('plotSettings.moveUp')}>
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(p, 1)}
              disabled={i === sibs.length - 1}
              title={t('plotSettings.moveDown')}
            >
              ▼
            </button>
            <button type="button" className={styles.smallBtn} onClick={() => addPlace(p.id)}>
              {t('plotSettings.addSub')}
            </button>
            <button type="button" className={styles.smallBtn} onClick={() => setEditing({ ...p })}>
              {t('plotSettings.edit')}
            </button>
          </span>
        </div>
        {siblingsOf(p.id).length > 0 && <ul className={styles.tree}>{renderNodes(p.id, depth + 1)}</ul>}
      </li>
    ));
  };

  return (
    <div>
      <ul className={styles.tree}>{renderNodes(null, 0)}</ul>
      <button type="button" className="button" onClick={() => addPlace(null)}>
        {t('plotSettings.addPlace')}
      </button>

      {editing && (
        <Modal title={t('plotSettings.editPlace')}>
          <label>
            {t('plotSettings.placeName')}
            <input
              className="text-input"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </label>
          <label>
            {t('plotSettings.placeDescription')}
            <textarea
              className="text-input"
              value={editing.description ?? ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </label>
          <label>
            {t('plotSettings.placeImage')}
            <input
              className="text-input"
              value={editing.image_url ?? ''}
              placeholder={t('plotSettings.imageUrlPlaceholder')}
              onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
            />
          </label>
          <ModalActions>
            <button type="button" className="button button--danger" onClick={deleteEditing}>
              {t('plotSettings.delete')}
            </button>
            <ModalSpacer />
            <button type="button" className="button button--ghost" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="button" onClick={saveEdit}>
              {t('common.save')}
            </button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
