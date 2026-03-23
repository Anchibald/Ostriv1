import Fastify from 'fastify';
import socketio from 'fastify-socket.io';

export function buildApp(opts = {}) {
  const fastify = Fastify(opts);

  fastify.register(socketio, {
    cors: {
      origin: '*'
    }
  });

  const sessions = new Map<string, { gm: string; players: string[] }>();

  fastify.ready().then(() => {
    fastify.io.on('connection', (socket) => {
      console.log(`[Socket] New connection: ${socket.id}`);

      // GM створює нову сесію
      socket.on('create-session', (callback) => {
        const sessionId = Math.random().toString(36).substring(2, 9);
        sessions.set(sessionId, { gm: socket.id, players: [] });
        socket.join(sessionId);
        console.log(`[Session] Created: ${sessionId} by GM ${socket.id}`);
        callback({ sessionId });
      });

      // Гравець приєднується до сесії
      socket.on('join-session', ({ sessionId }, callback) => {
        console.log(`[Session] Join attempt: ${sessionId} by player ${socket.id}`);
        if (sessions.has(sessionId)) {
          socket.join(sessionId);
          sessions.get(sessionId)!.players.push(socket.id);
          
          // Повідомити всіх у кімнаті, включаючи GM
          fastify.io.to(sessionId).emit('player-joined', { playerId: socket.id });
          
          console.log(`[Session] Joined: ${sessionId} by player ${socket.id}`);
          callback({ success: true });
        } else {
          console.log(`[Session] Not found: ${sessionId}`);
          callback({ success: false, error: 'Session not found' });
        }
      });
    });
  });

  fastify.get('/', async () => {
    return { status: 'ok', message: 'RPG Island Survival Server' };
  });

  return fastify;
}
