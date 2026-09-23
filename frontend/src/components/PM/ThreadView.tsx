import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RichTextEditor from '../RichTextEditor';
import RichText from '../RichTextEditor/RichText';
import { EMPTY_DOC } from '../RichTextEditor/schema';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
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
  created_at: string;
  messages: Message[];
}

interface ThreadViewProps {
  chat: Chat;
  onBack: () => void;
  onRefresh: () => void;
}

export default function ThreadView({ chat, onBack, onRefresh }: ThreadViewProps) {
  const { t } = useTranslation();
  const characterId = localStorage.getItem('characterId');
  const [messages, setMessages] = useState(chat.messages || []);
  const [body, setBody] = useState(EMPTY_DOC);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!body.content || body.content.length === 0) return;

    setSending(true);
    try {
      const res = await fetch(apiUrl(`/pm/chats/${chat.id}/messages`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          ...characterHeaders(),
        },
        body: JSON.stringify({ body }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages([...messages, msg]);
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

  const chatName = chat.type === 'group' ? chat.name : messages[0]?.from_character_name || 'Chat';

  return (
    <div className={styles.threadView}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>
          {t('pm.back')}
        </button>
        <h2 className={styles.title}>{chatName}</h2>
        <button className={styles.refreshBtn} onClick={onRefresh}>
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
            <RichText value={msg.body} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.composer}>
        <RichTextEditor value={body} onChange={setBody} />
        <button className={styles.sendBtn} onClick={handleSendMessage} disabled={sending}>
          {sending ? t('pm.sending') : t('pm.send')}
        </button>
      </div>
    </div>
  );
}
