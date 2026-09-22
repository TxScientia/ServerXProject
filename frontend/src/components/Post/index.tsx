import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import RichTextEditor, { RichText, isEmptyDoc, type RichTextDoc } from '../RichTextEditor';
import type { PostRead } from '../Scene/types';
import styles from './Post.module.css';

type Props = {
  post: PostRead;
  storybookId: string;
  sceneId: string;
  /** The scene's first post — editing it may also rename the scene. */
  isFirst?: boolean;
  sceneTitle?: string;
  /** The viewer is this post's author and may edit it. */
  editable?: boolean;
  onChanged: () => void;
};

function editHeaders() {
  return { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() };
}

export default function Post({
  post,
  storybookId,
  sceneId,
  isFirst = false,
  sceneTitle = '',
  editable = false,
  onChanged,
}: Props) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [body, setBody] = useState<RichTextDoc | null>(post.body);
  const [title, setTitle] = useState(sceneTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setBody(post.body);
    setTitle(sceneTitle);
    setError(null);
    setIsEditing(true);
  };

  const save = async () => {
    if (isEmptyDoc(body)) {
      setError(t('scene.emptyPost'));
      return;
    }
    if (isFirst && !title.trim()) {
      setError(t('scene.emptyTitle'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch(
        apiUrl(`/storybooks/${storybookId}/scenes/${sceneId}/posts/${post.id}`),
        {
          method: 'PATCH',
          headers: editHeaders(),
          body: JSON.stringify({ body, ...(isFirst ? { title: title.trim() } : {}) }),
        },
      );
      if (!resp.ok) throw new Error();
      setIsEditing(false);
      onChanged();
    } catch {
      setError(t('scene.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const author = post.author_name ?? '???';
  const timestamp = new Date(post.created_at).toLocaleString();

  return (
    <article className={styles.post}>
      <header className={styles.byline}>
        <span className={styles.avatar} aria-hidden="true">
          {author.charAt(0).toUpperCase()}
        </span>
        <span className={styles.author}>{author}</span>
        <time className={styles.time} dateTime={post.created_at}>
          {timestamp}
        </time>
        {post.edited_at && <span className={styles.edited}>{t('scene.edited')}</span>}
        {editable && !isEditing && (
          <button type="button" className={styles.editBtn} onClick={startEdit}>
            {t('scene.edit')}
          </button>
        )}
      </header>

      {isEditing ? (
        <div className={styles.editArea}>
          {isFirst && (
            <input
              className={`text-input ${styles.titleInput}`}
              value={title}
              placeholder={t('scene.titlePlaceholder')}
              onChange={(e) => setTitle(e.target.value)}
            />
          )}
          <RichTextEditor value={body} onChange={setBody} disabled={saving} autoFocus />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setIsEditing(false)}
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
            <button type="button" className="button" onClick={save} disabled={saving}>
              {t('common.save')}
            </button>
          </div>
        </div>
      ) : (
        <RichText value={post.body} className={styles.body} />
      )}
    </article>
  );
}
