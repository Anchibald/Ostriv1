import Fastify from 'fastify';
import socketio from 'fastify-socket.io';
import { JSONFilePreset } from 'lowdb/node';

interface LogEntry {
  type: 'chat' | 'roll' | 'system' | 'emote';
  sender?: string;
  message?: string;
  dice?: string;
  result?: string;
  timestamp: string;
}

interface SessionData {
  gm: string;
  players: string[];
  logs: LogEntry[];
}

interface Data {
  sessions: Record<string, SessionData>;
}

export function buildApp(opts = {}) {
  const fastify = Fastify(opts);

  fastify.register(socketio, {
    cors: {
      origin: '*'
    }
  });

  // Ініціалізація бази даних
  const defaultData: Data = { sessions: {} };
  let db: any;

  const getDb = async () => {
    if (!db) {
      db = await JSONFilePreset<Data>('db.json', defaultData);
    }
    return db;
  };

  fastify.ready().then(async () => {
    const database = await getDb();

    fastify.io.on('connection', (socket) => {
      // GM створює нову сесію
      socket.on('create-session', async (callback) => {
        const sessionId = Math.random().toString(36).substring(2, 9);
        database.data.sessions[sessionId] = { 
          gm: socket.id, 
          players: [], 
          logs: [{
            type: 'system',
            message: `Експедиція розпочалася. ID: ${sessionId}`,
            timestamp: new Date().toISOString()
          }] 
        };
        await database.write();
        socket.join(sessionId);
        callback({ sessionId });
      });

      // Гравець приєднується до сесії
      socket.on('join-session', async ({ sessionId }, callback) => {
        const session = database.data.sessions[sessionId];
        if (session) {
          socket.join(sessionId);
          if (!session.players.includes(socket.id)) {
            session.players.push(socket.id);
            await database.write();
          }
          
          fastify.io.to(sessionId).emit('player-joined', { playerId: socket.id });
          
          // Надсилаємо історію логів новому гравцеві
          callback({ success: true, history: session.logs });
        } else {
          callback({ success: false, error: 'Session not found' });
        }
      });

      // Надсилання повідомлення або команди
      socket.on('send-message', async ({ sessionId, message }) => {
        const session = database.data.sessions[sessionId];
        if (!session) return;

        let log: LogEntry;

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
              log = {
                type: 'roll',
                sender: socket.id,
                dice,
                result: result.toString(),
                timestamp: new Date().toISOString()
              };
            } else {
               log = { type: 'chat', sender: socket.id, message, timestamp: new Date().toISOString() };
            }
          } else if (command === '/emote') {
            log = {
              type: 'emote',
              sender: socket.id,
              message: args.join(' '),
              timestamp: new Date().toISOString()
            };
          } else {
            log = { type: 'chat', sender: socket.id, message, timestamp: new Date().toISOString() };
          }
        } else {
          log = {
            type: 'chat',
            sender: socket.id,
            message,
            timestamp: new Date().toISOString()
          };
        }

        session.logs.push(log!);
        await database.write();
        fastify.io.to(sessionId).emit('new-log', log!);
      });
    });
  });

  fastify.get('/', async () => {
    return { status: 'ok', message: 'RPG Island Survival Server' };
  });

  return fastify;
}
