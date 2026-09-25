import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import RichTextEditor, { isEmptyDoc, type RichTextDoc } from '../RichTextEditor';
import OOCMessageCard from './OOCMessageCard';
import type { OOCMessage, OOCScope } from './types';
import styles from './OOC.module.css';

function endpoint(scope: OOCScope) {
  return scope.type === 'global' ? '/ooc/messages' : `/storybooks/${scope.storybookId}/ooc/messages`;
}

export default function OOCChannel({ scope, scroll = false }: { scope: OOCScope; scroll?: boolean }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<OOCMessage[]>([]);
  const [body, setBody] = useState<RichTextDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const url = endpoint(scope);
  const canPost = Boolean(localStorage.getItem('characterId'));

  const load = useCallback(() => {
    setLoading(true);
    fetch(apiUrl(url), { headers: { ...authHeaders(), ...characterHeaders() } })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: OOCMessage[]) => {
        setMessages(data);
        setError(null);
      })
      .catch(() => setError(t('ooc.loadError')))
      .finally(() => setLoading(false));
  }, [url, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async () => {
    if (isEmptyDoc(body)) {
      setError(t('ooc.emptyMessage'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const resp = await fetch(apiUrl(url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() },
        body: JSON.stringify({ body }),
      });
      if (!resp.ok) throw new Error();
      setBody(null);
      load();
    } catch {
      setError(t('ooc.saveError'));
    } finally {
      setSending(false);
    }
  };

  const list = (
    <div className={styles.messages}>
      {loading ? (
        <p className={styles.muted}>{t('common.loading')}</p>
      ) : messages.length === 0 ? (
        <p className={styles.muted}>{t('ooc.empty')}</p>
      ) : (
        messages.map((m) => <OOCMessageCard key={m.id} message={m} />)
      )}
      <div ref={endRef} />
    </div>
  );

  return (
    <section className={styles.channel}>
      <div className={scroll ? `${styles.messages} ${styles.scroll}` : styles.messages}>{list}</div>
      <div className={styles.composer}>
        {canPost ? (
          <>
            <RichTextEditor
              value={body}
              onChange={setBody}
              disabled={sending}
              placeholder={t('ooc.placeholder')}
              minRows={3}
            />
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button type="button" className="button" onClick={send} disabled={sending}>
                {sending ? t('common.saving') : t('ooc.send')}
              </button>
            </div>
          </>
        ) : (
          <p className={styles.muted}>{t('ooc.selectCharacter')}</p>
        )}
      </div>
    </section>
  );
}
