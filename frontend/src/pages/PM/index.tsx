import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import PMNavigation from '../../components/PM/PMNavigation';
import ChatList from '../../components/PM/ChatList';
import ThreadView from '../../components/PM/ThreadView';
import SystemMessagesTab from '../../components/PM/SystemMessagesTab';
import CreateChatModal from '../../components/PM/CreateChatModal';
import { apiUrl, authHeaders } from '../../api';
import { useWebSocket } from '../../realtime/WebSocketProvider';
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
  const { subscribe, refreshPmUnread } = useWebSocket();
  const [activeTab, setActiveTab] = useState<TabType>('groups');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  const [systemUnread, setSystemUnread] = useState(0);

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

  const fetchSystemUnread = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/pm/system-messages/unread-count'), {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSystemUnread(data.count ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch system unread count:', error);
    }
  }, []);

  useEffect(() => {
    fetchCharacters();
    fetchChats();
    fetchSystemUnread();
  }, []);

  // Live updates: refresh the chat list / system badge when messages arrive for chats
  // other than the one currently open (the open chat is handled inline by ThreadView).
  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'new_message') {
        if (selectedChat && selectedChat.id === msg.chat_id) return;
        fetchChats();
      } else if (msg.type === 'system_message') {
        fetchSystemUnread();
      }
    });
    return unsub;
  }, [subscribe, selectedChat, fetchChats, fetchSystemUnread]);

  // A live message landed in the open chat: mark it read server-side and refresh badges.
  const handleIncomingForOpenChat = useCallback(() => {
    if (!selectedChat) return;
    const chatId = selectedChat.id;
    fetch(apiUrl(`/pm/chats/${chatId}`), { headers: authHeaders() })
      .catch(() => undefined)
      .finally(() => {
        refreshPmUnread();
        fetchChats();
      });
  }, [selectedChat, refreshPmUnread, fetchChats]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedChat(null);
  };

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
        refreshPmUnread(); // chat was marked read server-side; sync the top-nav badge

        // Auto-select first character from chat that belongs to this account
        if (chat.member_names && chat.member_names.length > 0) {
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

  const handleCreateDirectChat = async (characterId: string, creatorCharacterId: string) => {
    try {
      const res = await fetch(apiUrl('/pm/chats/direct'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          'X-Character-Id': creatorCharacterId,
        },
        body: JSON.stringify({ character_id: characterId }),
      });

      if (res.ok) {
        const newChat = await res.json();
        setShowCreateChatModal(false);
        localStorage.setItem('characterId', creatorCharacterId);
        // Automatically select and enter the new chat
        await handleSelectChat(newChat);
      } else {
        alert('Fehler beim Erstellen des Chats');
      }
    } catch (error) {
      console.error('Failed to create direct chat:', error);
      alert(t('scene.saveError'));
    }
  };

  const handleCreateGroupChat = async (characterIds: string[], groupName: string, creatorCharacterId: string) => {
    try {
      const res = await fetch(apiUrl('/pm/chats/group'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          'X-Character-Id': creatorCharacterId,
        },
        body: JSON.stringify({ name: groupName, character_ids: characterIds }),
      });

      if (res.ok) {
        const newChat = await res.json();
        setShowCreateChatModal(false);
        localStorage.setItem('characterId', creatorCharacterId);
        // Automatically select and enter the new chat
        await handleSelectChat(newChat);
      } else {
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

  const leftNav = (
    <PMNavigation
      activeTab={activeTab}
      onTabChange={handleTabChange}
      groupsUnread={groupsUnread}
      directUnread={directUnread}
      systemUnread={systemUnread}
    />
  );

  return (
    <AppLayout leftNav={leftNav}>
      <div className={styles.pmContainer}>
        <div className={styles.header}>
          <h1 className={styles.title}>Nachrichten</h1>
          <button className={styles.newChatBtn} onClick={() => setShowCreateChatModal(true)}>
            + Neuer Chat
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'system' ? (
            <SystemMessagesTab onResponded={fetchSystemUnread} />
          ) : selectedChat ? (
            <ThreadView
              chat={selectedChat}
              onBack={handleBackToList}
              onRefresh={handleRefresh}
              onIncoming={handleIncomingForOpenChat}
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
            accountCharacters={characters}
          />
        )}
      </div>
    </AppLayout>
  );
}
