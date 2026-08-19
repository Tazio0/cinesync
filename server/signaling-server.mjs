import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  return rooms.get(roomId);
}

function broadcast(roomId, payload, excludeSocket = null) {
  const room = getRoom(roomId);
  for (const socket of room.values()) {
    if (socket.socket !== excludeSocket && socket.socket.readyState === 1) {
      socket.socket.send(JSON.stringify(payload));
    }
  }
}

const wss = new WebSocketServer({ host: HOST, port: PORT, path: '/ws' });

wss.on('connection', (socket) => {
  let activeRoomId = null;
  let activeUserId = null;

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const roomId = msg.roomId;

      if (!roomId) return;

      switch (msg.type) {
        case 'join-room': {
          const room = getRoom(roomId);
          const user = {
            ...msg.user,
            id: msg.user?.id || `guest-${Math.random().toString(36).slice(2, 10)}`,
          };

          activeRoomId = roomId;
          activeUserId = user.id;
          room.set(user.id, { socket, user });

          const members = [...room.values()].map(({ user: member }) => member);
          socket.send(JSON.stringify({ type: 'room-members', roomId, members }));
          broadcast(roomId, { type: 'presence', user, action: 'joined', members }, socket);
          console.log(`[watch-party] ${user.name || 'guest'} joined ${roomId} (${members.length} members)`);
          break;
        }

        case 'chat-message': {
          if (!activeRoomId) return;
          broadcast(activeRoomId, { type: 'chat-message', message: msg.message }, null);
          break;
        }

        case 'reaction-message': {
          if (!activeRoomId) return;
          broadcast(activeRoomId, {
            type: 'reaction-message',
            emoji: msg.emoji,
            senderName: msg.senderName,
          }, null);
          break;
        }

        default:
          break;
      }
    } catch {
      // ignore malformed JSON payloads
    }
  });

  socket.on('close', () => {
    if (!activeRoomId || !activeUserId) return;
    const room = getRoom(activeRoomId);
    if (room.has(activeUserId)) {
      room.delete(activeUserId);
      const members = [...room.values()].map(({ user }) => user);
      broadcast(activeRoomId, { type: 'presence', action: 'left', userId: activeUserId, members });
      if (room.size === 0) {
        rooms.delete(activeRoomId);
      }
    }
  });
});

console.log(`[watch-party] signaling server listening on ws://${HOST}:${PORT}/ws`);
