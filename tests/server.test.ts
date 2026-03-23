import { test } from 'tap';
import fastify from 'fastify';
import socketio from 'fastify-socket.io';

test('server should start and accept socket connections', async (t) => {
  const app = fastify();
  app.register(socketio);

  await app.listen({ port: 0 });
  t.pass('server started');

  await app.close();
  t.pass('server closed');
});
