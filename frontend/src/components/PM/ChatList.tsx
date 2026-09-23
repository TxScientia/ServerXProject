import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl, authHeaders } from '../../api';
import ChatCard from './ChatCard';
import styles from './ChatList.module.css';

interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  member_count: number;
  created_at: string;
  member_names?: string[];
  unread_count: number;
}

interface Character {
  id: string;
  name: string;
}

interface ChatListProps {
  chats: Chat[];
  loading: boolean;
  onSelectChat: (chat: Chat) => void;
  onRefresh: () => void;
  onCreateChat?: (characterId: string) => void;
}

export default function ChatList({
  chats,
  loading,
  onSelectChat,
  onRefresh,
  onCreateChat,
}: ChatListProps) {
  const { t } = useTranslation();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setCharacters([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(apiUrl('/residents'), {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const filtered = (data || []).filter((c: Character) =>
          c.name.toLowerCase().includes(query.toLowerCase())
        );
        setCharacters(filtered.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to search characters:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectCharacter = (char: Character) => {
    if (onCreateChat) {
      console.log('Creating chat with character:', char);
      onCreateChat(char.id);
    }
    setSearchQuery('');
    setCharacters([]);
    setShowSearch(false);
  };

  if (loading) {
    return <div className={styles.loading}>{t('common.loading')}</div>;
  }

  return (
    <div className={styles.chatListWrapper}>
      <div className={styles.header}>
        <button className={styles.newChatBtn} onClick={() => setShowSearch(!showSearch)}>
          + Neuer Chat
        </button>
      </div>

      {showSearch && (
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Charakter suchen..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            className={styles.searchInput}
          />
          {searchQuery && (
            <div className={styles.dropdown}>
              {searchLoading ? (
                <div className={styles.dropdownItem}>{t('common.loading')}</div>
              ) : characters.length === 0 ? (
                <div className={styles.dropdownItem}>Keine Charaktere gefunden</div>
              ) : (
                characters.map((char) => (
                  <div
                    key={char.id}
                    className={styles.dropdownItem}
                    onClick={() => handleSelectCharacter(char)}
                  >
                    {char.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {chats.length === 0 ? (
        <div className={styles.empty}>
          <p>{t('pm.noChats')}</p>
          <button className={styles.refreshBtn} onClick={onRefresh}>
            {t('pm.refresh')}
          </button>
        </div>
      ) : (
        <div className={styles.chatList}>
          {chats.map((chat) => {
            const displayName = chat.type === 'group' ? chat.name : chat.member_names?.join(' & ') || t('pm.tabDirect');
            return (
              <ChatCard
                key={chat.id}
                displayName={displayName}
                memberCount={chat.member_count}
                unreadCount={chat.unread_count}
                onClick={() => onSelectChat(chat)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
