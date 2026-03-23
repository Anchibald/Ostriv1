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
      // GM створює нову сесію
      socket.on('create-session', (callback) => {
        const sessionId = Math.random().toString(36).substring(2, 9);
        sessions.set(sessionId, { gm: socket.id, players: [] });
        socket.join(sessionId);
        callback({ sessionId });
      });

      // Гравець приєднується до сесії
      socket.on('join-session', ({ sessionId }, callback) => {
        if (sessions.has(sessionId)) {
          socket.join(sessionId);
          sessions.get(sessionId)!.players.push(socket.id);
          
          fastify.io.to(sessionId).emit('player-joined', { playerId: socket.id });
          callback({ success: true });
        } else {
          callback({ success: false, error: 'Session not found' });
        }
      });

      // Надсилання текстового повідомлення
      socket.on('send-message', ({ sessionId, message }) => {
        if (sessions.has(sessionId)) {
          fastify.io.to(sessionId).emit('new-log', {
            type: 'chat',
            sender: socket.id,
            message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Надсилання результату кидка кубика
      socket.on('send-roll', ({ sessionId, dice, result }) => {
        if (sessions.has(sessionId)) {
          fastify.io.to(sessionId).emit('new-log', {
            type: 'roll',
            sender: socket.id,
            dice,
            result,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  });

  fastify.get('/', async () => {
    return { status: 'ok', message: 'RPG Island Survival Server' };
  });

  return fastify;
}
