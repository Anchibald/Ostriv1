import { test } from 'tap';
import { buildApp } from '../src/app.js';
import { io as Client } from 'socket.io-client';

test('session management', async (t) => {
  const fastify = buildApp();
  await fastify.ready();

  await fastify.listen({ port: 0 });
  const address = fastify.server.address() as any;
  const url = `http://localhost:${address.port}`;

  // GM Client
  const gmClient = Client(url, { transports: ['websocket'] });
  
  // Отримати sessionId
  const sessionId = await new Promise<string>((resolve) => {
    gmClient.emit('create-session', (res: any) => resolve(res.sessionId));
  });

  t.ok(sessionId, 'GM should receive a session ID');

  // Очікуємо приєднання гравця
  const playerJoinedPromise = new Promise<string>((resolve) => {
    gmClient.on('player-joined', (data) => resolve(data.playerId));
  });

  // Player Client
  const playerClient = Client(url, { transports: ['websocket'] });
  
  const joinRes = await new Promise<any>((resolve) => {
    playerClient.emit('join-session', { sessionId }, (res: any) => resolve(res));
  });

  t.ok(joinRes.success, 'Player should successfully join the session');

  const joinedPlayerId = await playerJoinedPromise;
  
  // У Socket.io-client id може бути undefined, поки він не підключиться повністю
  // Але подія 'player-joined' на сервері використовує socket.id з сервера.
  t.ok(joinedPlayerId, 'GM should receive notification with a playerId');

  gmClient.close();
  playerClient.close();
  await fastify.close();
});
