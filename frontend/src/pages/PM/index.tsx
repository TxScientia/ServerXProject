import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import ChatList from '../../components/PM/ChatList';
import ThreadView from '../../components/PM/ThreadView';
import SystemMessagesTab from '../../components/PM/SystemMessagesTab';
import { apiUrl, authHeaders, characterHeaders } from '../../api';
import styles from './PM.module.css';

type TabType = 'groups' | 'direct' | 'system';

interface Chat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  member_count: number;
  created_at: string;
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createInput, setCreateInput] = useState('');

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/pm/chats'), {
        headers: { ...authHeaders(), ...characterHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      } else {
        console.error('Failed to fetch chats:', res.status);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectChat = async (chat: Chat) => {
    try {
      const res = await fetch(apiUrl(`/pm/chats/${chat.id}`), {
        headers: { ...authHeaders(), ...characterHeaders() },
      });
      if (res.ok) {
        const detail = await res.json();
        setSelectedChat(detail);
      }
    } catch (error) {
      console.error('Failed to fetch chat detail:', error);
    }
  };

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  const handleRefresh = () => {
    fetchChats();
    if (selectedChat) {
      handleSelectChat(selectedChat);
    }
  };

  const handleCreateChat = async () => {
    if (!createInput.trim()) return;

    try {
      const res = await fetch(apiUrl('/pm/chats/direct'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          ...characterHeaders(),
        },
        body: JSON.stringify({ character_id: createInput.trim() }),
      });

      if (res.ok) {
        setCreateInput('');
        setShowCreateDialog(false);
        fetchChats();
      } else {
        alert(t('scene.saveError'));
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      alert(t('scene.saveError'));
    }
  };

  const filteredChats = chats.filter((chat) => {
    if (activeTab === 'groups') return chat.type === 'group';
    if (activeTab === 'direct') return chat.type === 'direct';
    return false;
  });

  return (
    <AppLayout>
      <div className={styles.pmContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            {t('pm.tabGroups')}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'direct' ? styles.active : ''}`}
            onClick={() => setActiveTab('direct')}
          >
            {t('pm.tabDirect')}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'system' ? styles.active : ''}`}
            onClick={() => setActiveTab('system')}
          >
            {t('pm.tabSystem')}
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
              onCreateChat={() => setShowCreateDialog(true)}
              chatType={activeTab === 'groups' ? 'group' : 'direct'}
            />
          )}
        </div>

        {showCreateDialog && (
          <div className={styles.dialogOverlay} onClick={() => setShowCreateDialog(false)}>
            <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
              <h3>Direkten Chat erstellen</h3>
              <p>Character ID eingeben:</p>
              <input
                type="text"
                placeholder="Character ID..."
                value={createInput}
                onChange={(e) => setCreateInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateChat()}
                className={styles.dialogInput}
              />
              <div className={styles.dialogActions}>
                <button onClick={handleCreateChat} className={styles.dialogBtn}>
                  Erstellen
                </button>
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className={`${styles.dialogBtn} ${styles.secondary}`}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
