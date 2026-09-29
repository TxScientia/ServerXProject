import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RichTextEditor from '../RichTextEditor';
import RichText from '../RichTextEditor/RichText';
import { EMPTY_DOC, isEmptyDoc } from '../RichTextEditor/schema';
import { apiUrl, authHeaders } from '../../api';
import { useWebSocket } from '../../realtime/WebSocketProvider';
import styles from './ThreadView.module.css';

interface Message {
  id: string;
  chat_id: string;
  from_character_id: string;
  from_character_name: string;
  body: Record<string, any>;
  created_at: string;
}

interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  member_count: number;
  member_names?: string[];
  created_at: string;
  messages: Message[];
}

interface ThreadViewProps {
  chat: Chat;
  onBack: () => void;
  onRefresh: () => void;
  /** Called when a live message arrives for this open chat, so the parent can mark it
   *  read and refresh unread badges. */
  onIncoming?: () => void;
}

interface Character {
  id: string;
  name: string;
}

export default function ThreadView({ chat, onBack, onRefresh, onIncoming }: ThreadViewProps) {
  const { t } = useTranslation();
  const { subscribe } = useWebSocket();
  const [characterId, setCharacterId] = useState(localStorage.getItem('characterId') || '');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [messages, setMessages] = useState(chat.messages || []);
  const [body, setBody] = useState(EMPTY_DOC);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset the thread when switching to a different chat.
  useEffect(() => {
    setMessages(chat.messages || []);
  }, [chat.id]);

  // Live delivery: append messages pushed for this chat, de-duping the sender's own
  // optimistic append (same id) and any echoes.
  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'new_message' && msg.chat_id === chat.id && msg.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.message.id) ? prev : [...prev, msg.message]
        );
        onIncoming?.();
      }
    });
    return unsub;
  }, [subscribe, chat.id, onIncoming]);

  useEffect(() => {
    // Fetch all characters to filter those in the chat
    fetch(apiUrl('/characters'), { headers: authHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Character[]) => {
        // Filter to only characters that are in this chat
        const chatChars = data.filter((c) => chat.member_names?.includes(c.name));
        setCharacters(chatChars);
      })
      .catch(() => {});
  }, [chat.member_names]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!characterId) {
      alert(t('scene.selectCharacterToPost'));
      return;
    }
    if (isEmptyDoc(body)) return;

    setSending(true);
    try {
      const res = await fetch(apiUrl(`/pm/chats/${chat.id}/messages`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          'X-Character-Id': characterId,
        },
        body: JSON.stringify({ body }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        setBody(EMPTY_DOC);
      } else {
        alert(t('scene.saveError'));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(t('scene.saveError'));
    } finally {
      setSending(false);
    }
  };

  const chatName = chat.type === 'group' ? chat.name : chat.member_names?.join(' & ') || 'Chat';
  const memberList = chat.member_names?.join(', ') || '';

  return (
    <div className={styles.threadView}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          {t('pm.back')}
        </button>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>{chatName}</h2>
          {memberList && <p className={styles.subtitle}>{memberList}</p>}
        </div>
        <button className={styles.refreshBtn} onClick={onRefresh} title="Aktualisieren">
          ↻
        </button>
      </div>

      <div className={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${msg.from_character_id === characterId ? styles.own : ''}`}
          >
            <div className={styles.byline}>
              <span className={styles.author}>{msg.from_character_name}</span>
              <span className={styles.timestamp}>
                {new Date(msg.created_at).toLocaleString('de-CH')}
              </span>
            </div>
            <RichText value={msg.body} className={styles.messageContent} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.composer}>
        {characters.length > 1 && (
          <select
            value={characterId}
            onChange={(e) => {
              setCharacterId(e.target.value);
              localStorage.setItem('characterId', e.target.value);
            }}
            className={styles.charSelector}
          >
            {characters.map((char) => (
              <option key={char.id} value={char.id}>
                {char.name}
              </option>
            ))}
          </select>
        )}
        <div className={styles.editorContainer}>
          <RichTextEditor value={body} onChange={setBody} />
        </div>
        <button
          className={styles.sendBtn}
          onClick={handleSendMessage}
          disabled={sending || isEmptyDoc(body)}
        >
          {sending ? t('pm.sending') : t('pm.send')}
        </button>
      </div>
    </div>
  );
}
