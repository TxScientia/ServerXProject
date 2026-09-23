import { useTranslation } from 'react-i18next';
import styles from './ChatList.module.css';

interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  member_count: number;
  created_at: string;
}

interface ChatListProps {
  chats: Chat[];
  loading: boolean;
  onSelectChat: (chat: Chat) => void;
  onRefresh: () => void;
}

export default function ChatList({
  chats,
  loading,
  onSelectChat,
  onRefresh,
}: ChatListProps) {
  const { t } = useTranslation();

  if (loading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  if (chats.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{t('pm.noChats')}</p>
        <button className={styles.refreshBtn} onClick={onRefresh}>
          {t('pm.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.chatList}>
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={styles.chatItem}
          onClick={() => onSelectChat(chat)}
        >
          <div className={styles.chatName}>
            {chat.type === 'group' ? chat.name : chat.name || t('pm.tabDirect')}
          </div>
          <div className={styles.chatMeta}>
            {chat.member_count} {t('pm.members', { count: chat.member_count })}
          </div>
        </div>
      ))}
    </div>
  );
}
