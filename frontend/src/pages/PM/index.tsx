import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import PMNavigation from '../../components/PM/PMNavigation';
import ChatList from '../../components/PM/ChatList';
import ThreadView from '../../components/PM/ThreadView';
import SystemMessagesTab from '../../components/PM/SystemMessagesTab';
import CreateChatModal from '../../components/PM/CreateChatModal';
import { apiUrl, authHeaders } from '../../api';
import styles from './PM.module.css';

interface Character {
  id: string;
  name: string;
}

type TabType = 'groups' | 'direct' | 'system';

interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  member_count: number;
  created_at: string;
  member_names?: string[];
  unread_count: number;
}

interface Message {
  id: string;
  chat_id: string;
  from_character_id: string;
  from_character_name: string;
  body: Record<string, any>;
  created_at: string;
}

interface ChatDetail extends Chat {
  messages: Message[];
}

export default function PM() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('groups');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);

  const fetchCharacters = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/characters'), {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCharacters(data);
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error);
    }
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      console.log('Fetching chats with headers:', authHeaders());
      const res = await fetch(apiUrl('/pm/chats'), {
        headers: authHeaders(),
      });
      console.log('Fetch chats response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Chats fetched:', data);
        setChats(data);
      } else {
        const error = await res.json().catch(() => ({}));
        console.error('Failed to fetch chats:', res.status, error);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
    fetchChats();
  }, []);

  const handleSelectChat = async (chat: Chat) => {
    try {
      // Immediately mark this chat as read in local state
      setChats(chats.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c));

      const res = await fetch(apiUrl(`/pm/chats/${chat.id}`), {
        headers: authHeaders(),
      });
      if (res.ok) {
        const detail = await res.json();
        setSelectedChat(detail);

        // Auto-select first character from chat that belongs to this account
        if (chat.member_names && chat.member_names.length > 0 && !localStorage.getItem('characterId')) {
          const firstCharId = characters.find(c => chat.member_names?.includes(c.name))?.id;
          if (firstCharId) {
            localStorage.setItem('characterId', firstCharId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch chat detail:', error);
    }
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    // Refresh chats to update badges
    fetchChats();
  };

  const handleRefresh = () => {
    fetchChats();
    if (selectedChat) {
      handleSelectChat(selectedChat);
    }
  };

  const handleCreateDirectChat = async (characterId: string) => {
    try {
      // Use first character from account as the sender
      const firstChar = characters[0];
      if (!firstChar) {
        alert('Fehler: Kein Charakter verfügbar');
        return;
      }

      const res = await fetch(apiUrl('/pm/chats/direct'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          'X-Character-Id': firstChar.id,
        },
        body: JSON.stringify({ character_id: characterId }),
      });

      if (res.ok) {
        const newChat = await res.json();
        setShowCreateChatModal(false);
        localStorage.setItem('characterId', firstChar.id);
        // Automatically select and enter the new chat
        await handleSelectChat(newChat);
      } else {
        const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
        alert('Fehler beim Erstellen des Chats');
      }
    } catch (error) {
      console.error('Failed to create direct chat:', error);
      alert(t('scene.saveError'));
    }
  };

  const handleCreateGroupChat = async (characterIds: string[], groupName: string) => {
    try {
      // Use first character from account as the creator
      const firstChar = characters[0];
      if (!firstChar) {
        alert('Fehler: Kein Charakter verfügbar');
        return;
      }

      const res = await fetch(apiUrl('/pm/chats/group'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          'X-Character-Id': firstChar.id,
        },
        body: JSON.stringify({ name: groupName, character_ids: characterIds }),
      });

      if (res.ok) {
        const newChat = await res.json();
        setShowCreateChatModal(false);
        localStorage.setItem('characterId', firstChar.id);
        // Automatically select and enter the new chat
        await handleSelectChat(newChat);
      } else {
        const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
        alert('Fehler beim Erstellen der Gruppe');
      }
    } catch (error) {
      console.error('Failed to create group chat:', error);
      alert(t('scene.saveError'));
    }
  };

  const filteredChats = chats.filter((chat) => {
    if (activeTab === 'groups') return chat.type === 'group';
    if (activeTab === 'direct') return chat.type === 'direct';
    return false;
  });

  const getUnreadCount = (type: 'groups' | 'direct') => {
    return chats
      .filter((chat) => chat.type === (type === 'groups' ? 'group' : 'direct'))
      .reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
  };

  const groupsUnread = getUnreadCount('groups');
  const directUnread = getUnreadCount('direct');
  const systemUnread = 0; // TODO: implement system message unread count
  const totalUnread = groupsUnread + directUnread + systemUnread;

  const leftNav = (
    <PMNavigation
      activeTab={activeTab}
      onTabChange={setActiveTab}
      groupsUnread={groupsUnread}
      directUnread={directUnread}
      systemUnread={systemUnread}
    />
  );

  return (
    <AppLayout pmUnreadCount={totalUnread} leftNav={leftNav}>
      <div className={styles.pmContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Nachrichten</h1>
          <button className={styles.newChatBtn} onClick={() => setShowCreateChatModal(true)}>
            + Neuer Chat
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'system' ? (
            <SystemMessagesTab />
          ) : selectedChat ? (
            <ThreadView
              chat={selectedChat}
              onBack={handleBackToList}
              onRefresh={handleRefresh}
            />
          ) : (
            <ChatList
              chats={filteredChats}
              loading={loading}
              onSelectChat={handleSelectChat}
              onRefresh={handleRefresh}
            />
          )}
        </div>

        {showCreateChatModal && (
          <CreateChatModal
            onClose={() => setShowCreateChatModal(false)}
            onCreateDirect={handleCreateDirectChat}
            onCreateGroup={handleCreateGroupChat}
            excludeCharacterIds={[]}
          />
        )}
      </div>
    </AppLayout>
  );
}
