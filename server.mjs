import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const COOKIE = 'demo_session=valid';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="240"><rect width="600" height="240" rx="16" fill="#dff5e9"/><text x="300" y="108" text-anchor="middle" font-family="sans-serif" font-size="32" font-weight="bold" fill="#087744">Authenticated image</text><text x="300" y="155" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#087744">Session cookie received</text></svg>';

export function createReproServer() {
  const events = new Map();
  return createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const id = url.searchParams.get('run');
    const cookie = request.headers.cookie || '';
    const authenticated = cookie.split(';').some((part) => part.trim() === COOKIE);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/session' && request.method === 'POST') {
      events.delete(id);
      response.setHeader('Set-Cookie', `${COOKIE}; HttpOnly; Path=/`);
      response.end(JSON.stringify({ cookieSet: true }));
    } else if (url.pathname === '/verify') {
      response.writeHead(authenticated ? 200 : 401);
      response.end(JSON.stringify({ cookie }));
    } else if (url.pathname === '/protected.svg') {
      const event = { imageStatus: authenticated ? 200 : 401, imageCookie: cookie };
      events.set(id, event);
      console.log(JSON.stringify({ run: id, ...event }));
      response.writeHead(event.imageStatus, { 'Content-Type': authenticated ? 'image/svg+xml' : 'text/plain' });
      response.end(authenticated ? SVG : 'Session cookie required');
    } else if (url.pathname === '/events') {
      response.end(JSON.stringify(events.get(id) || {}));
    } else {
      response.writeHead(404);
      response.end(JSON.stringify({ error: 'Not found' }));
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createReproServer().listen(4317, '127.0.0.1', () => {
    console.log('Cookie repro server listening at http://127.0.0.1:4317');
  });
}
