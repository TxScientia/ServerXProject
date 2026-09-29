import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { apiUrl, authHeaders, wsUrl, AUTH_EVENT } from '../api';

/** A message pushed from the server over the PM WebSocket. */
export interface RealtimeMessage {
  type: 'new_message' | 'system_message' | 'pong';
  chat_id?: string;
  message?: any;
}

interface WebSocketContextValue {
  /** Total unread across direct + group chats + system messages, kept live. */
  pmUnread: number;
  /** Re-fetch the authoritative unread total from the server (call after marking read). */
  refreshPmUnread: () => void;
  /** Subscribe to incoming realtime messages; returns an unsubscribe function. */
  subscribe: (handler: (msg: RealtimeMessage) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const RECONNECT_DELAY_MS = 3000;
const HEARTBEAT_MS = 25000;
const REFRESH_DEBOUNCE_MS = 400;
// Server-side rejection codes (see backend routes/pm.py) — don't retry these.
const WS_UNAUTHORIZED = 4401;
const WS_FORBIDDEN_ORIGIN = 4403;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [pmUnread, setPmUnread] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<(msg: RealtimeMessage) => void>>(new Set());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against reconnect attempts after the provider unmounts.
  const closedByUs = useRef(false);

  const doRefreshPmUnread = useCallback(() => {
    if (!localStorage.getItem('token')) {
      setPmUnread(0);
      return;
    }
    Promise.all([
      fetch(apiUrl('/pm/chats'), { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : []))
        .then((chats: any[]) => chats.reduce((sum, c) => sum + (c.unread_count || 0), 0))
        .catch(() => 0),
      fetch(apiUrl('/pm/system-messages/unread-count'), { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : { count: 0 }))
        .then((d) => d.count ?? 0)
        .catch(() => 0),
    ]).then(([chatUnread, systemUnread]) => setPmUnread(chatUnread + systemUnread));
  }, []);

  // Debounced so a burst of messages in a busy chat coalesces into one refetch pair
  // instead of two HTTP requests per message.
  const refreshPmUnread = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(doRefreshPmUnread, REFRESH_DEBOUNCE_MS);
  }, [doRefreshPmUnread]);

  const clearTimers = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  };

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    // Only one live socket; skip if already open/connecting or not logged in.
    if (!token) return;
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    closedByUs.current = false;
    const ws = new WebSocket(wsUrl(`/pm/ws?token=${encodeURIComponent(token)}`));
    wsRef.current = ws;

    ws.onopen = () => {
      clearTimers();
      heartbeatTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, HEARTBEAT_MS);
      refreshPmUnread();
    };

    ws.onmessage = (event) => {
      let data: RealtimeMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === 'pong') return;
      handlersRef.current.forEach((h) => h(data));
      if (data.type === 'new_message' || data.type === 'system_message') {
        refreshPmUnread();
      }
    };

    ws.onclose = (event) => {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }
      // Don't retry on auth/origin rejection — a reconnect would fail the same way.
      if (event.code === WS_UNAUTHORIZED || event.code === WS_FORBIDDEN_ORIGIN) return;
      // Otherwise reconnect, unless we closed intentionally or lost the token.
      if (!closedByUs.current && localStorage.getItem('token')) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };
  }, [refreshPmUnread]);

  const disconnect = useCallback(() => {
    closedByUs.current = true;
    clearTimers();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setPmUnread(0);
  }, []);

  // Reconnect/disconnect when auth changes (same-tab custom event + cross-tab storage).
  useEffect(() => {
    connect();

    const onAuth = () => {
      if (localStorage.getItem('token')) {
        disconnect();
        closedByUs.current = false;
        connect();
      } else {
        disconnect();
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'token') onAuth();
    };

    window.addEventListener(AUTH_EVENT, onAuth);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      window.removeEventListener('storage', onStorage);
      disconnect();
    };
  }, [connect, disconnect]);

  const subscribe = useCallback((handler: (msg: RealtimeMessage) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ pmUnread, refreshPmUnread, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

/** Access the realtime context. Safe to call anywhere under <WebSocketProvider>. */
export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    // Rendered outside the provider — return inert defaults so callers don't crash.
    return { pmUnread: 0, refreshPmUnread: () => {}, subscribe: () => () => {} };
  }
  return ctx;
}
