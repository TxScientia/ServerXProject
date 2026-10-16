import { apiUrl, authHeaders, characterHeaders } from '../api';

/**
 * Create-or-open a direct chat between the character you're currently playing as
 * (the acting character, from the X-Character-Id header) and the given author,
 * returning the chat id. The backend reuses an existing direct chat if there is one.
 *
 * Use this to wire any "message" button attached to someone's post: one click →
 * a chat between the acting character and the post's author. Then navigate to
 * `/pm?chat=<id>` to open it.
 */
export async function openDirectChatWith(authorCharacterId: string): Promise<string> {
  const res = await fetch(apiUrl('/pm/chats/direct'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...characterHeaders() },
    body: JSON.stringify({ character_id: authorCharacterId }),
  });
  if (!res.ok) throw new Error('Failed to open direct chat');
  const chat = await res.json();
  return chat.id as string;
}
