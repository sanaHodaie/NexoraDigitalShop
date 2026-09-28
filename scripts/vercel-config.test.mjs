import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import unavailable from '../api/backend-unavailable.js';

const environmentNames = ['NEXORA_API_ORIGIN', 'VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL'];
const originalEnvironment = Object.fromEntries(environmentNames.map(name => [name, process.env[name]]));
let importNumber = 0;

beforeEach(() => {
  for (const name of environmentNames) delete process.env[name];
});
afterEach(() => {
  for (const name of environmentNames) {
    if (originalEnvironment[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnvironment[name];
  }
});

async function readConfig(environment = {}) {
  Object.assign(process.env, environment);
  return (await import(`../vercel.mjs?test=${++importNumber}`)).config;
}

test('an absent backend routes API requests to a failure handler before the SPA', async () => {
  const config = await readConfig();

  assert.equal(config.framework, 'vite');
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
  assert.deepEqual(config.rewrites, [
    { source: '/api/:path*', destination: '/api/backend-unavailable' },
    { source: '/(.*)', destination: '/index.html' },
  ]);
});

test('a blank backend uses the unavailable handler', async () => {
  const config = await readConfig({ NEXORA_API_ORIGIN: '   ' });
  assert.equal(config.rewrites[0].destination, '/api/backend-unavailable');
});

for (const origin of ['https://api.example.com', 'https://api.example.com/', 'https://API.EXAMPLE.COM:443/']) {
  test(`the HTTPS origin ${origin} retains the API path in its rewrite`, async () => {
    const config = await readConfig({ NEXORA_API_ORIGIN: origin });
    assert.deepEqual(config.rewrites[0], {
      source: '/api/:path*', destination: 'https://api.example.com/api/:path*',
    });
  });
}

for (const origin of [
  'http://api.example.com',
  'api.example.com',
  'https://username:password@api.example.com',
  'https://@api.example.com',
  'https://api.example.com/api',
  'https://api.example.com/./',
  'https://api.example.com?key=value',
  'https://api.example.com?',
  'https://api.example.com#fragment',
  'https://api.example.com#',
  'https://api.example.com\\api',
  'https://',
]) {
  test(`invalid API origin is rejected: ${origin}`, async () => {
    await assert.rejects(readConfig({ NEXORA_API_ORIGIN: origin }), /NEXORA_API_ORIGIN/);
  });
}

for (const origin of [
  'https://localhost:7043',
  'https://localhost.',
  'https://api.localhost',
  'https://127.0.0.1',
  'https://127.1',
  'https://0x7f000001',
  'https://127.255.255.255',
  'https://0.0.0.0',
  'https://[::]',
  'https://[::1]',
  'https://[0:0:0:0:0:0:0:1]',
  'https://[::ffff:127.0.0.1]',
]) {
  test(`local API origin is rejected: ${origin}`, async () => {
    await assert.rejects(readConfig({ NEXORA_API_ORIGIN: origin }), /localhost or a loopback address/);
  });
}

for (const origin of [
  'https://nexora-digital-shop.vercel.app',
  'https://NEXORA-DIGITAL-SHOP.vercel.app:443/',
  'https://nexora-digital-shop.vercel.app.',
]) {
  test(`the known frontend cannot proxy back to itself: ${origin}`, async () => {
    await assert.rejects(readConfig({ NEXORA_API_ORIGIN: origin }), /proxy loop/);
  });
}

for (const name of ['VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL']) {
  test(`${name} prevents a self-referencing proxy`, async () => {
    await assert.rejects(readConfig({
      NEXORA_API_ORIGIN: 'https://nexora-preview.vercel.app',
      [name]: 'nexora-preview.vercel.app',
    }), /proxy loop/);
  });
}

test('unavailable handler returns uncached JSON 503 for reads and writes', async () => {
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    const response = await unavailable.fetch(new Request('https://shop.example.com/api/auth/register', { method }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('content-type'), /application\/json/);
    const body = await response.json();
    assert.match(body.error, /[\u0600-\u06ff]/);
    assert.equal(body.token, undefined);
  }
});
