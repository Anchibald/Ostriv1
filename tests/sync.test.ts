import { test } from 'tap';
import { buildApp } from '../src/app.js';
import { io as Client } from 'socket.io-client';

test('real-time sync: messages and dice rolls', async (t) => {
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

  // Тест повідомлення: гравець надсилає, GM отримує
  const messagePromise = new Promise<any>((resolve) => {
    gmClient.on('new-log', function listener(data) {
      if (data.type === 'chat') {
        gmClient.off('new-log', listener);
        resolve(data);
      }
    });
  });

  playerClient.emit('send-message', { sessionId, message: 'Привіт, я вижив!' });

  const receivedMsg = await messagePromise;
  t.equal(receivedMsg.message, 'Привіт, я вижив!', 'GM should receive player message');
  t.equal(receivedMsg.type, 'chat', 'Message type should be chat');

  // Тест кидка кубика: GM надсилає, гравець отримує
  const rollPromise = new Promise<any>((resolve) => {
    playerClient.on('new-log', function listener(data) {
      if (data.type === 'roll') {
        playerClient.off('new-log', listener);
        resolve(data);
      }
    });
  });

  gmClient.emit('send-roll', { sessionId, result: '20', dice: '1d20' });

  const receivedRoll = await rollPromise;
  t.equal(receivedRoll.dice, '1d20', 'Player should receive dice type');
  t.equal(receivedRoll.result, '20', 'Player should receive roll result');
  t.equal(receivedRoll.type, 'roll', 'Message type should be roll');

  gmClient.close();
  playerClient.close();
  await fastify.close();
});
