import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders } from '../../api';
import SystemMessageCard, { SystemMessage } from './SystemMessageCard/SystemMessageCard';
import styles from './SystemMessagesTab.module.css';

interface SystemMessagesTabProps {
  /** Called after a message is answered, so the parent can refresh the unread badge. */
  onResponded?: () => void;
}

export default function SystemMessagesTab({ onResponded }: SystemMessagesTabProps) {
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
        onResponded?.();
      }
    } catch (error) {
      console.error('Failed to respond to system message:', error);
    }
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
        <SystemMessageCard key={msg.id} msg={msg} onRespond={handleRespond} />
      ))}
    </div>
  );
}
