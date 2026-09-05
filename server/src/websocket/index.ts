import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';

/**
 * WebSocket layer — v1 ships the infrastructure only:
 *  - presence (online player count)
 *  - room abstraction ready for real-time multiplayer races
 *
 * Game logic stays controller-driven (PlayerController / AIController /
 * NetworkPlayerController) so races can later be mirrored through rooms
 * without touching the race engine.
 */

interface Room {
  id: string;
  clients: Set<WebSocket>;
}

export function setupWebsocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const rooms = new Map<string, Room>();

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: { type?: string; room?: string };
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg.type === 'join' && msg.room) {
        let room = rooms.get(msg.room);
        if (!room) {
          room = { id: msg.room, clients: new Set() };
          rooms.set(msg.room, room);
        }
        room.clients.add(ws);
        broadcast(room, { type: 'peer-joined', count: room.clients.size });
      } else if (msg.type === 'leave' && msg.room) {
        rooms.get(msg.room)?.clients.delete(ws);
      }
    });

    ws.on('close', () => {
      for (const room of rooms.values()) room.clients.delete(ws);
    });

    ws.send(JSON.stringify({ type: 'welcome', online: wss.clients.size }));
  });

  const broadcast = (room: Room, msg: unknown) => {
    const data = JSON.stringify(msg);
    for (const client of room.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  };

  return wss;
}
