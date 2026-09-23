import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders } from '../../api';
import styles from './SystemMessagesTab.module.css';

interface SystemMessage {
  id: string;
  from_account_id: string;
  to_account_id: string;
  type: 'still_playing' | 'invite' | 'plot_link' | 'system_news';
  content: string;
  action_required: boolean;
  data?: Record<string, any>;
  response?: Record<string, any>;
  created_at: string;
}

export default function SystemMessagesTab() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemMessages();
  }, []);

  const fetchSystemMessages = async () => {
    try {
      const res = await fetch(apiUrl('/pm/system-messages'), {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch system messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (messageId: string, action: string) => {
    try {
      const res = await fetch(apiUrl(`/pm/system-messages/${messageId}/respond`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchSystemMessages();
      }
    } catch (error) {
      console.error('Failed to respond to system message:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      still_playing: t('pm.typeStillPlaying'),
      invite: t('pm.typeInvite'),
      plot_link: t('pm.typePlotLink'),
      system_news: t('pm.typeSystemNews'),
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className={styles.container}>{t('common.loading')}</div>;
  }

  if (messages.length === 0) {
    return <div className={styles.container}>{t('pm.noSystemMessages')}</div>;
  }

  return (
    <div className={styles.container}>
      {messages.map((msg) => (
        <div key={msg.id} className={styles.systemMessage}>
          <div className={styles.header}>
            <span className={styles.type}>{getTypeLabel(msg.type)}</span>
            <span className={styles.timestamp}>
              {new Date(msg.created_at).toLocaleString('de-CH')}
            </span>
          </div>
          <p className={styles.content}>{msg.content}</p>

          {msg.action_required && !msg.response && (
            <div className={styles.actions}>
              {msg.type === 'still_playing' && (
                <>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleRespond(msg.id, 'free')}
                  >
                    {t('pm.free')}
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.primary}`}
                    onClick={() => handleRespond(msg.id, 'keep_occupied')}
                  >
                    {t('pm.keepOccupied')}
                  </button>
                </>
              )}
              {msg.type === 'invite' && (
                <>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleRespond(msg.id, 'decline')}
                  >
                    {t('pm.decline')}
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.primary}`}
                    onClick={() => handleRespond(msg.id, 'accept')}
                  >
                    {t('pm.accept')}
                  </button>
                </>
              )}
            </div>
          )}

          {msg.response && (
            <div className={styles.responded}>
              {t('pm.answered', { action: msg.response.action })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
