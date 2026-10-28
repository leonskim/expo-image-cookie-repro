import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createReproServer } from './server.mjs';

test('only a real session cookie authorizes the image, and records the request', async () => {
  const server = createReproServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const session = await fetch(`${base}/session?run=test`, { method: 'POST' });
    assert.equal(session.headers.get('set-cookie'), 'demo_session=valid; HttpOnly; Path=/');
    const cookie = session.headers.get('set-cookie').split(';')[0];
    for (const headers of [{}, { Cookie: 'not_demo_session=valid' }]) {
      assert.equal((await fetch(`${base}/protected.svg?run=test`, { headers })).status, 401);
    }
    assert.equal((await fetch(`${base}/verify`, { headers: { Cookie: cookie } })).status, 200);
    const image = await fetch(`${base}/protected.svg?run=test`, { headers: { Cookie: cookie } });
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('cache-control'), 'no-store');
    assert.match(await image.text(), /Authenticated image/);
    assert.deepEqual(await (await fetch(`${base}/events?run=test`)).json(), {
      imageStatus: 200, imageCookie: cookie,
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
