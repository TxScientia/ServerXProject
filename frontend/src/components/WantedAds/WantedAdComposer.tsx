import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders, characterHeaders, fetchAuthenticated } from '../../api';
import RichTextEditor, { isEmptyDoc, type RichTextDoc } from '../RichTextEditor';
import type { WantedAdScope } from './types';
import styles from './WantedAds.module.css';

interface WantedAdComposerProps {
  scope: WantedAdScope;
  onCreated: () => void;
  onCancel: () => void;
}

function endpoint(scope: WantedAdScope) {
  return scope.type === 'global' ? '/wanted-ads' : `/storybooks/${scope.storybookId}/wanted-ads`;
}

export default function WantedAdComposer({ scope, onCreated, onCancel }: WantedAdComposerProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState<RichTextDoc | null>(null);
  const [tags, setTags] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) {
      setError(t('gesuche.titleRequired'));
      return;
    }
    if (isEmptyDoc(body)) {
      setError(t('gesuche.bodyRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetchAuthenticated(apiUrl(endpoint(scope)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() },
        body: JSON.stringify({ title: title.trim(), body, tags: tags.map((tag) => tag.trim()).filter(Boolean) }),
      });
      if (!res.ok) throw new Error();
      setTitle('');
      setBody(null);
      setTags(['']);
      onCreated();
    } catch {
      setError(t('gesuche.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.composer}>
      <input
        type="text"
        className={styles.titleInput}
        placeholder={t('gesuche.titlePlaceholder')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={saving}
      />
      <fieldset className={styles.tagFields} disabled={saving}>
        <legend>{t('gesuche.tagsLabel')}</legend>
        <p className={styles.tagHint}>{t('gesuche.tagsHint')}</p>
        <div className={styles.tagInputs}>
          {tags.map((tag, index) => (
            <div key={index} className={styles.tagField}>
              <input
                type="text"
                className="text-input"
                aria-label={t('gesuche.tagNumber', { number: index + 1 })}
                placeholder={t('gesuche.tagPlaceholder')}
                maxLength={50}
                value={tag}
                onChange={(e) => setTags((current) => current.map((value, i) => i === index ? e.target.value : value))}
              />
              {tags.length > 1 && (
                <button
                  type="button"
                  className={`button ${styles.tagRemove}`}
                  aria-label={t('gesuche.removeTag', { number: index + 1 })}
                  onClick={() => setTags((current) => current.filter((_, i) => i !== index))}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {tags.length < 6 && (
          <button type="button" className={`button ${styles.tagAdd}`} onClick={() => setTags((current) => [...current, ''])}>
            {t('gesuche.addTag')}
          </button>
        )}
      </fieldset>
      <RichTextEditor
        value={body}
        onChange={setBody}
        disabled={saving}
        placeholder={t('gesuche.bodyPlaceholder')}
        minRows={4}
      />
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.composerActions}>
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
        <button type="button" className="button" onClick={submit} disabled={saving}>
          {saving ? t('common.saving') : t('gesuche.create')}
        </button>
      </div>
    </div>
  );
}
