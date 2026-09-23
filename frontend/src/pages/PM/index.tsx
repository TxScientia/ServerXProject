import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AppLayout from '../../pageLayouts/appLayout/AppLayout';
import ChatList from '../../components/PM/ChatList';
import ThreadView from '../../components/PM/ThreadView';
import SystemMessagesTab from '../../components/PM/SystemMessagesTab';
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
  const [pendingChatCharacterId, setPendingChatCharacterId] = useState<string | null>(null);
  const [showCharacterPicker, setShowCharacterPicker] = useState(false);
  const [pickedCharacterId, setPickedCharacterId] = useState<string | null>(null);

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
  };

  const handleRefresh = () => {
    fetchChats();
    if (selectedChat) {
      handleSelectChat(selectedChat);
    }
  };

  const handleCreateChat = (characterId: string) => {
    console.log('handleCreateChat called with:', characterId);
    setPendingChatCharacterId(characterId);
    setShowCharacterPicker(true);
  };

  const handleConfirmCharacterAndCreate = async (actingCharacterId: string) => {
    console.log('handleConfirmCharacterAndCreate called', { actingCharacterId, pendingChatCharacterId });
    if (!pendingChatCharacterId) {
      console.error('No pending chat character ID set!');
      alert('Fehler: Kein Charakter zum Chatten ausgewählt');
      return;
    }

    try {
      console.log('Creating direct chat with character ID:', pendingChatCharacterId);
      const res = await fetch(apiUrl('/pm/chats/direct'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          'X-Character-Id': actingCharacterId,
        },
        body: JSON.stringify({ character_id: pendingChatCharacterId }),
      });

      console.log('Create chat response:', res.status);
      if (res.ok) {
        console.log('Chat created successfully');
        setShowCharacterPicker(false);
        setPendingChatCharacterId(null);
        localStorage.setItem('characterId', actingCharacterId);
        console.log('About to fetch chats...');
        await fetchChats();
        console.log('Chats fetched successfully');
      } else {
        const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('Failed to create chat:', res.status, error);
        let errorMsg = t('scene.saveError');
        if (error.detail) {
          if (Array.isArray(error.detail)) {
            errorMsg = error.detail.map((e: any) => e.msg || e).join(', ');
          } else if (typeof error.detail === 'string') {
            errorMsg = error.detail;
          }
        }
        alert(`Fehler beim Erstellen: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Exception in handleConfirmCharacterAndCreate:', error);
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
              onCreateChat={handleCreateChat}
            />
          )}
        </div>

        {showCharacterPicker && (
          <div className={styles.pickerOverlay} onClick={() => setShowCharacterPicker(false)}>
            <div className={styles.picker} onClick={(e) => e.stopPropagation()}>
              <h3>Welcher Charakter schreibt?</h3>
              <div className={styles.characterOptions}>
                {characters.map((char) => (
                  <button
                    key={char.id}
                    className={`${styles.characterOption} ${
                      char.id === pickedCharacterId ? styles.selected : ''
                    }`}
                    onClick={() => setPickedCharacterId(char.id)}
                  >
                    {char.name}
                    {char.id === pickedCharacterId && ' ✓'}
                  </button>
                ))}
              </div>
              <div className={styles.pickerActions}>
                <button
                  className={styles.pickerOk}
                  onClick={() => {
                    if (pickedCharacterId) {
                      handleConfirmCharacterAndCreate(pickedCharacterId);
                      setPickedCharacterId(null);
                    }
                  }}
                  disabled={!pickedCharacterId}
                >
                  OK
                </button>
                <button
                  className={styles.pickerCancel}
                  onClick={() => {
                    setShowCharacterPicker(false);
                    setPickedCharacterId(null);
                  }}
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
