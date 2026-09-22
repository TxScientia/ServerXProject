import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RichTextEditor, { isEmptyDoc, type RichTextDoc } from '../RichTextEditor';
import styles from './PostComposer.module.css';

type Props = {
  /** 'newScene' shows a title field and starts a scene; 'reply' adds a post. */
  mode: 'newScene' | 'reply';
  onSubmit: (payload: { title?: string; body: RichTextDoc }) => Promise<void>;
};

export default function PostComposer({ mode, onSubmit }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState<RichTextDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (isEmptyDoc(body)) {
      setError(t('scene.emptyPost'));
      return;
    }
    if (mode === 'newScene' && !title.trim()) {
      setError(t('scene.emptyTitle'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ body: body as RichTextDoc, ...(mode === 'newScene' ? { title: title.trim() } : {}) });
      setTitle('');
      setBody(null);
    } catch {
      setError(t('scene.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.composer}>
      {mode === 'newScene' && (
        <input
          className={`text-input ${styles.title}`}
          value={title}
          placeholder={t('scene.titlePlaceholder')}
          onChange={(e) => setTitle(e.target.value)}
        />
      )}
      <RichTextEditor
        value={body}
        onChange={setBody}
        disabled={submitting}
        placeholder={mode === 'newScene' ? t('scene.firstPostPlaceholder') : t('scene.replyPlaceholder')}
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" className="button" onClick={submit} disabled={submitting}>
          {mode === 'newScene' ? t('scene.startScene') : t('scene.reply')}
        </button>
      </div>
    </div>
  );
}
