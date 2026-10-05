"""In-process WebSocket registry for real-time delivery.

Kept dependency-free (no routes/crud imports) so any layer can schedule a push. The
registry maps account_id -> open sockets, because delivery and the unread badge are
per-account, not per-character. This is single-process only; a multi-worker deployment
would need a shared broker (Redis pub/sub) behind the same interface.
"""
from __future__ import annotations

import asyncio
import uuid

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[uuid.UUID, list[WebSocket]] = {}
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, account_id: uuid.UUID, websocket: WebSocket):
        await websocket.accept()
        # Capture the running loop so sync request handlers can schedule pushes onto it.
        self._loop = asyncio.get_running_loop()
        self.active_connections.setdefault(account_id, []).append(websocket)

    def disconnect(self, account_id: uuid.UUID, websocket: WebSocket):
        conns = self.active_connections.get(account_id)
        if not conns:
            return
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            del self.active_connections[account_id]

    async def _send(self, account_id: uuid.UUID, data: dict):
        for connection in list(self.active_connections.get(account_id, [])):
            try:
                await connection.send_json(data)
            except Exception:  # noqa: BLE001 — drop broken sockets silently
                self.disconnect(account_id, connection)

    def broadcast_threadsafe(self, account_id: uuid.UUID, data: dict):
        """Fire-and-forget push callable from sync (threadpool) request handlers.

        No-ops when no event loop is running yet (e.g. no client has ever connected,
        or under the sync test client), so it never breaks the HTTP response.
        """
        loop = self._loop
        if loop is None or not loop.is_running():
            return
        asyncio.run_coroutine_threadsafe(self._send(account_id, data), loop)


manager = ConnectionManager()
