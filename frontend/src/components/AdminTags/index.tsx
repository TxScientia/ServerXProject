import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalActions, ModalSpacer } from '../Modal';
import { apiUrl, authHeaders } from '../../api';
import styles from './AdminTags.module.css';

type Tag = { id: string; name: string };

/** Admin-only management of the shared tag pool: list, add, rename, delete. */
export default function AdminTags() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Tag | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(apiUrl('/tags'), { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then(setTags)
      .catch(() => setError(t('admin.tagLoadError')));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const jsonHeaders = { 'Content-Type': 'application/json', ...authHeaders() };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    const res = await fetch(apiUrl('/admin/tags'), {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ name }),
    });
    if (res.status === 409) {
      setError(t('admin.tagExists'));
      return;
    }
    if (!res.ok) {
      setError(t('admin.tagSaveError'));
      return;
    }
    setNewName('');
    load();
  };

  const saveRename = async (tag: Tag) => {
    const name = editingName.trim();
    if (!name || name === tag.name) {
      setEditingId(null);
      return;
    }
    const res = await fetch(apiUrl(`/admin/tags/${tag.id}`), {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ name }),
    });
    if (res.status === 409) {
      setError(t('admin.tagExists'));
      return;
    }
    setEditingId(null);
    load();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await fetch(apiUrl(`/admin/tags/${pendingDelete.id}`), { method: 'DELETE', headers: authHeaders() });
    setPendingDelete(null);
    load();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.addRow}>
        <input
          className="text-input"
          value={newName}
          placeholder={t('admin.tagPlaceholder')}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" className="button" onClick={add}>
          {t('admin.addTag')}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {tags.length === 0 ? (
        <p className={styles.muted}>{t('admin.noTags')}</p>
      ) : (
        <ul className={styles.list}>
          {tags.map((tag) => (
            <li key={tag.id} className={styles.row}>
              {editingId === tag.id ? (
                <>
                  <input
                    className="text-input"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(tag);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button type="button" className="button" onClick={() => saveRename(tag)}>
                    {t('common.save')}
                  </button>
                  <button type="button" className="button button--ghost" onClick={() => setEditingId(null)}>
                    {t('common.cancel')}
                  </button>
                </>
              ) : (
                <>
                  <span className={styles.name}>{tag.name}</span>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => {
                      setEditingId(tag.id);
                      setEditingName(tag.name);
                    }}
                  >
                    {t('admin.editTag')}
                  </button>
                  <button type="button" className="button button--ghost" onClick={() => setPendingDelete(tag)}>
                    {t('common.delete')}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendingDelete && (
        <Modal title={t('admin.deleteTagTitle')}>
          <p>{t('admin.deleteTagConfirm', { name: pendingDelete.name })}</p>
          <ModalActions>
            <button type="button" className="button button--ghost" onClick={() => setPendingDelete(null)}>
              {t('common.cancel')}
            </button>
            <ModalSpacer />
            <button type="button" className="button" onClick={confirmDelete}>
              {t('common.delete')}
            </button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}
