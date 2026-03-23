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

      // Надсилання повідомлення або команди
      socket.on('send-message', ({ sessionId, message }) => {
        if (!sessions.has(sessionId)) return;

        // Перевірка на команди
        if (message.startsWith('/')) {
          const [command, ...args] = message.split(' ');
          
          if (command === '/roll') {
            const dice = args[0] || '1d20';
            const match = dice.match(/^(\d+)d(\d+)$/i);
            if (match) {
              const count = parseInt(match[1]);
              const sides = parseInt(match[2]);
              let result = 0;
              for (let i = 0; i < count; i++) {
                result += Math.floor(Math.random() * sides) + 1;
              }
              fastify.io.to(sessionId).emit('new-log', {
                type: 'roll',
                sender: socket.id,
                dice,
                result: result.toString(),
                timestamp: new Date().toISOString()
              });
              return;
            }
          }

          if (command === '/emote') {
            fastify.io.to(sessionId).emit('new-log', {
              type: 'emote',
              sender: socket.id,
              message: args.join(' '),
              timestamp: new Date().toISOString()
            });
            return;
          }
        }

        // Звичайне текстове повідомлення
        fastify.io.to(sessionId).emit('new-log', {
          type: 'chat',
          sender: socket.id,
          message,
          timestamp: new Date().toISOString()
        });
      });
    });
  });

  fastify.get('/', async () => {
    return { status: 'ok', message: 'RPG Island Survival Server' };
  });

  return fastify;
}
