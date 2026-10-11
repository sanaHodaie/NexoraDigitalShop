// Re-encode existing artwork; content and transparency are preserved. Run from repo root.
// Local browser smoke checks against a running Vite server and seeded API.
// Only GET requests are made to the real API; no user records are changed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const base = process.env.NEXORA_UI_URL || 'http://127.0.0.1:3002';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = await mkdtemp(join(tmpdir(), 'nexora-catalog-'));
const browser = spawn(process.env.NEXORA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${output}`, '--no-first-run',
  '--no-default-browser-check', '--disable-extensions', '--no-proxy-server', 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let port;
  for (let i = 0; i < 80; i++) {
    try { port = (await readFile(join(output, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await wait(150); }
  }
  assert.ok(port, 'Browser started');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map(), errors = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  };
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    const timer = setTimeout(() => { pending.delete(next); reject(new Error(`Timeout: ${method}`)); }, 15000);
    pending.set(next, message => { clearTimeout(timer); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); });
    socket.send(JSON.stringify({ id: next, method, params }));
  });
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function until(expression) {
    for (let i = 0; i < 80; i++) { if (await evaluate(expression)) return; await wait(150); }
    throw new Error(`Condition not met: ${expression}`);
  }
  await command('Runtime.enable');
  await command('Page.bringToFront');
  await command('Network.enable');
  await command('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*', 'https://images.unsplash.com/*'] });

  const { readdir, stat } = await import('node:fs/promises');
  const sources = [
    ...(await readdir('public/assets')).filter(f => f.endsWith('.jpg')).map(f => ['public/assets/' + f, f.startsWith('hero_') ? 1600 : 800]),
    ...['smartphones', 'laptops', 'audio', 'gaming', 'smart-home'].map(f => ['public/assets/category-heroes/' + f + '.png', 800]),
    ...['auth-headphones', 'auth-earbuds', 'account-phone'].map(f => ['src/assets/images/' + f + '.png', 800]),
  ];
  let before = 0, after = 0;
  for (const [file, maxWidth] of sources) {
    const source = await readFile(file);
    const type = file.endsWith('.png') ? 'png' : 'jpeg';
    const encoded = await evaluate(`(async () => {
      const img = new Image(); img.src = 'data:image/${type};base64,${source.toString('base64')}'; await img.decode();
      const scale = Math.min(1, ${maxWidth} / img.naturalWidth);
      const canvas = document.createElement('canvas'); canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', .85);
    })()`);
    assert.ok(encoded.startsWith('data:image/webp;base64,'));
    const bytes = Buffer.from(encoded.split(',')[1], 'base64');
    const destination = file.replace(/\.(jpg|png)$/, '.webp');
    await writeFile(destination, bytes);
    before += source.length; after += bytes.length;
    console.log(`${destination}: ${source.length} -> ${bytes.length} bytes`);
  }
  console.log(`TOTAL ${before} -> ${after} bytes (${Math.round((1-after/before)*100)}% reduction)`);
} finally { socket?.close(); browser.kill(); }
