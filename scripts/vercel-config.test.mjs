import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));

test('the deployed JSON config routes API requests before the SPA', () => {
  assert.equal(config.framework, 'vite');
  assert.equal(config.buildCommand, 'npm run build:vercel');
  assert.equal(config.outputDirectory, 'dist');
  const apiIndex = config.rewrites.findIndex(rule => rule.source === '/api/:path*');
  const api = config.rewrites[apiIndex];
  assert.ok(apiIndex >= 0 && apiIndex < config.rewrites.length - 1);
  assert.match(api.destination, /^https:\/\/[^/]+\/api\/:path\*$/);
  assert.notEqual(new URL(api.destination).hostname, 'nexora-digital-shop.vercel.app');
  assert.ok(config.rewrites.some(rule => rule.source === '/business/:path*' && rule.destination === '/business/index.html'));
  assert.deepEqual(config.rewrites.at(-1), { source: '/(.*)', destination: '/index.html' });
});

test('frontend CSP allows the actual Google integration without arbitrary script execution', () => {
  const headers = Object.fromEntries(config.headers.find(rule => rule.source === '/(.*)').headers.map(h => [h.key.toLowerCase(), h.value]));
  const csp = headers['content-security-policy'];
  const scripts = csp.split(';').find(part => part.trim().startsWith('script-src'));
  assert.ok(scripts.includes("'self'"));
  assert.ok(scripts.includes('https://accounts.google.com/gsi/client'));
  assert.doesNotMatch(scripts, /unsafe-inline|unsafe-eval|\*/);
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.ok(headers['strict-transport-security'].includes('max-age='));
});

test('private and email-token pages are not cached or indexed', () => {
  for (const page of ['account', 'business', 'reset-password', 'verify-email', 'confirm-email-change']) {
    const rule = config.headers.find(rule => rule.source === `/${page}/:path*`);
    assert.ok(rule, page);
    assert.ok(rule.headers.some(h => h.key === 'X-Robots-Tag' && h.value.includes('noindex')));
    assert.ok(rule.headers.some(h => h.key === 'Cache-Control' && h.value.includes('no-store')));
  }
});
