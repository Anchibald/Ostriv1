import { test } from 'tap';
import { buildApp } from '../src/app.js';
import { io as Client } from 'socket.io-client';

test('command system: /roll and /emote', async (t) => {
  const fastify = buildApp();
  await fastify.ready();
  await fastify.listen({ port: 0 });
  const address = fastify.server.address() as any;
  const url = `http://localhost:${address.port}`;

  const gmClient = Client(url, { transports: ['websocket'] });
  
  const sessionId = await new Promise<string>((resolve) => {
    gmClient.emit('create-session', (res: any) => resolve(res.sessionId));
  });

  const playerClient = Client(url, { transports: ['websocket'] });
  await new Promise((resolve) => {
    playerClient.emit('join-session', { sessionId }, () => resolve(null));
  });

  // Тест /roll 1d20
  const rollPromise = new Promise<any>((resolve) => {
    gmClient.on('new-log', function listener(data) {
      if (data.type === 'roll') {
        gmClient.off('new-log', listener);
        resolve(data);
      }
    });
  });

  playerClient.emit('send-message', { sessionId, message: '/roll 1d20' });

  const rollLog = await rollPromise;
  t.equal(rollLog.dice, '1d20', 'Should identify dice type');
  t.ok(parseInt(rollLog.result) >= 1 && parseInt(rollLog.result) <= 20, 'Result should be between 1 and 20');

  // Тест /emote
  const emotePromise = new Promise<any>((resolve) => {
    playerClient.on('new-log', function listener(data) {
      if (data.type === 'emote') {
        playerClient.off('new-log', listener);
        resolve(data);
      }
    });
  });

  gmClient.emit('send-message', { sessionId, message: '/emote шукає їжу' });

  const emoteLog = await emotePromise;
  t.equal(emoteLog.message, 'шукає їжу', 'Should extract emote message');
  t.equal(emoteLog.type, 'emote', 'Type should be emote');

  gmClient.close();
  playerClient.close();
  await fastify.close();
});
