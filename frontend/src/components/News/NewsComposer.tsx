import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import RichTextEditor, { EMPTY_DOC, isEmptyDoc, RichText, type RichTextDoc } from '../RichTextEditor';
import NewsCard from './NewsCard';
import type { NewsItem, NewsKind, NewsScope } from './types';
import styles from './News.module.css';

type Props = {
  scope: NewsScope;
  onCreated?: () => void;
};

const KINDS: NewsKind[] = ['info', 'update', 'maintenance', 'warning'];

function endpoint(scope: NewsScope) {
  return scope.type === 'global' ? '/admin/news' : `/storybooks/${scope.storybookId}/news`;
}

export default function NewsComposer({ scope, onCreated }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<NewsKind>('info');
  const [pinned, setPinned] = useState(false);
  const [body, setBody] = useState<RichTextDoc>(EMPTY_DOC);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && !isEmptyDoc(body) && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const response = await fetch(apiUrl(endpoint(scope)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() },
        body: JSON.stringify({ title, body, kind, pinned }),
      });
      if (!response.ok) throw new Error();
      setTitle('');
      setKind('info');
      setPinned(false);
      setBody(EMPTY_DOC);
      setOk(t('news.saved'));
      onCreated?.();
    } catch (e) {
      setError(t('news.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const preview: NewsItem = {
    id: 'preview',
    scope_type: scope.type === 'global' ? 'global' : 'space',
    space_id: scope.type === 'storybook' ? scope.storybookId : null,
    title: title.trim() || t('news.titlePlaceholder'),
    body,
    kind,
    pinned,
    author_account_id: 'preview',
    author_login_name: t('news.previewAuthor'),
    author_character_id: null,
    author_character_name: null,
    created_at: new Date().toISOString(),
    updated_at: null,
  };

  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <div className={styles.form}>
          <label className={styles.field}>
            {t('news.title')}
            <input
              className="text-input"
              value={title}
              placeholder={t('news.titlePlaceholder')}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              {t('news.kindLabel')}
              <select className="select-input" value={kind} onChange={(e) => setKind(e.target.value as NewsKind)}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>{t(`news.kind.${k}`)}</option>
                ))}
              </select>
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              {t('news.pin')}
            </label>
          </div>

          <label className={styles.field}>
            {t('news.body')}
            <RichTextEditor value={body} onChange={setBody} placeholder={t('news.bodyPlaceholder')} minRows={8} />
          </label>

          {error && <p className={styles.error}>{error}</p>}
          {ok && <p className={styles.muted}>{ok}</p>}

          <div className={styles.actions}>
            <button type="button" className="button" disabled={!canSubmit} onClick={submit}>
              {saving ? t('common.saving') : t('news.publish')}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h3 className={styles.previewTitle}>{t('news.preview')}</h3>
        {isEmptyDoc(body) ? <RichText value={EMPTY_DOC} /> : <NewsCard item={preview} />}
      </section>
    </div>
  );
}
