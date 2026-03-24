import Fastify from 'fastify';
import socketio from 'fastify-socket.io';
import { JSONFilePreset } from 'lowdb/node';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
}

interface LogEntry {
  type: 'chat' | 'roll' | 'system' | 'emote';
  sender?: string;
  message?: string;
  dice?: string;
  result?: string;
  timestamp: string;
}

interface Character {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  food: number;
  water: number;
  hasShelter: boolean;
  inventory: InventoryItem[];
}

interface SessionData {
  islandName: string;
  gmKey: string;
  createdAt: string;
  day: number;
  isNight: boolean;
  timer: {
    duration: number;
    remaining: number;
    isRunning: boolean;
  };
  campInventory: {
    food: number;
    water: number;
    items: InventoryItem[];
  };
  players: Record<string, Character>;
  logs: LogEntry[];
}

interface Data {
  sessions: Record<string, SessionData>;
}

const ISLAND_NAMES = [
  "Острів Загублених Душ",
  "Берег Скелетів",
  "Туманна Бухта",
  "Риф Одинака",
  "Зелений Пекло",
  "Острів Диких Квітів",
  "Скеля Бур",
  "Затока Спокою"
];

export function buildApp(opts = {}) {
  const fastify = Fastify(opts);

  fastify.register(socketio, {
    cors: {
      origin: '*'
    }
  });

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
      // GM отримує список своїх сесій (за gmKey, але для MVP поки що всі сесії)
      socket.on('get-sessions', async (callback) => {
        const sessionsList = Object.entries(database.data.sessions).map(([id, data]: [string, any]) => ({
          id,
          islandName: data.islandName,
          createdAt: data.createdAt,
          playersCount: Object.keys(data.players).length
        }));
        callback(sessionsList);
      });

      // GM створює нову сесію
      socket.on('create-session', async (callback) => {
        const sessionId = Math.random().toString(36).substring(2, 9);
        const gmKey = Math.random().toString(36).substring(2, 15);
        const islandName = ISLAND_NAMES[Math.floor(Math.random() * ISLAND_NAMES.length)];
        
        const newSession: SessionData = {
          islandName,
          gmKey,
          createdAt: new Date().toISOString(),
          day: 1,
          isNight: false,
          timer: { duration: 0, remaining: 0, isRunning: false },
          campInventory: { food: 0, water: 0, items: [] },
          players: {},
          logs: [{
            type: 'system',
            message: `Експедиція на ${islandName} розпочалася. ID: ${sessionId}`,
            timestamp: new Date().toISOString()
          }]
        };

        database.data.sessions[sessionId] = newSession;
        await database.write();
        socket.join(sessionId);
        callback({ sessionId, gmKey, islandName });
      });

      // GM видаляє сесію
      socket.on('delete-session', async ({ sessionId, gmKey }, callback) => {
        const session = database.data.sessions[sessionId];
        if (session && session.gmKey === gmKey) {
          delete database.data.sessions[sessionId];
          await database.write();
          callback({ success: true });
        } else {
          callback({ success: false });
        }
      });

      // Перевірка прав Провідника (GM)
      socket.on('reconnect-gm', async ({ sessionId, gmKey }, callback) => {
        const session = database.data.sessions[sessionId];
        if (session && session.gmKey === gmKey) {
          socket.join(sessionId);
          callback({ success: true, session });
        } else {
          callback({ success: false });
        }
      });

      // Гравець створює персонажа та приєднується
      socket.on('join-session', async ({ sessionId, name, startingItem }, callback) => {
        const session = database.data.sessions[sessionId];
        if (session) {
          socket.join(sessionId);
          let character = Object.values(session.players).find(p => p.name === name);
          
          if (!character) {
            character = {
              id: socket.id,
              name,
              hp: 10,
              maxHp: 10,
              food: 3,
              water: 3,
              hasShelter: false,
              inventory: startingItem ? [{ id: Math.random().toString(36).substring(7), name: startingItem, quantity: 1 }] : []
            };
            session.players[socket.id] = character;
            
            session.logs.push({
              type: 'system',
              message: `${name} приєднався до виживання, маючи при собі: ${startingItem || 'нічого'}`,
              timestamp: new Date().toISOString()
            });
            
            await database.write();
            fastify.io.to(sessionId).emit('player-joined', { character });
          }
          
          callback({ success: true, session, characterId: character.id });
        } else {
          callback({ success: false, error: 'Session not found' });
        }
      });

      socket.on('send-message', async ({ sessionId, message }) => {
        const session = database.data.sessions[sessionId];
        if (!session) return;

        let log: LogEntry;
        const senderChar = session.players[socket.id];
        const displayName = senderChar ? senderChar.name : (session.gmKey ? 'Провідник' : '???');

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
                sender: displayName,
                dice,
                result: result.toString(),
                timestamp: new Date().toISOString()
              };
            } else {
               log = { type: 'chat', sender: displayName, message, timestamp: new Date().toISOString() };
            }
          } else if (command === '/emote') {
            log = {
              type: 'emote',
              sender: displayName,
              message: args.join(' '),
              timestamp: new Date().toISOString()
            };
          } else {
            log = { type: 'chat', sender: displayName, message, timestamp: new Date().toISOString() };
          }
        } else {
          log = {
            type: 'chat',
            sender: displayName,
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
