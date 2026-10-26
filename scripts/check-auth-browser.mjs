// Explicit opt-in is required before creating a diagnostic account on the live site.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.NEXORA_UI_URL || 'http://127.0.0.1:3012';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname)
  || (process.env.NEXORA_LIVE_AUTH_TEST === '1' && base === 'https://nexora-digital-shop.vercel.app'));
const output = await mkdtemp(join(tmpdir(), 'nexora-auth-check-'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const email = `nexora-browser-${randomBytes(6).toString('hex')}@example.test`;
const password = randomBytes(24).toString('base64url');
const browser = spawn(process.env.NEXORA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${output}`, '--no-first-run',
  '--no-default-browser-check', '--disable-extensions',
  process.env.NEXORA_BROWSER_PROXY ? `--proxy-server=${process.env.NEXORA_BROWSER_PROXY}` : '--no-proxy-server',
  'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let socket;
const contexts = [];
try {
  let info;
  for (let i = 0; i < 80; i++) {
    try { info = (await readFile(join(output, 'DevToolsActivePort'), 'utf8')).trim().split('\n'); break; }
    catch { await wait(150); }
  }
  assert.ok(info, 'Chrome started');
  socket = new WebSocket(`ws://127.0.0.1:${info[0]}${info[1]}`);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === 'Network.responseReceived') {
      const response = message.params.response;
      const path = new URL(response.url).pathname;
      if (path.startsWith('/api/auth/') || path === '/api/csrf') console.log(JSON.stringify({ path, status: response.status }));
    }
  };
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const next = ++id;
    const timer = setTimeout(() => { pending.delete(next); reject(new Error(`Timeout: ${method}`)); }, 90000);
    pending.set(next, message => { clearTimeout(timer); message.error ? reject(new Error(message.error.message)) : resolve(message.result); });
    socket.send(JSON.stringify({ id: next, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  for (const width of [1440, 375]) {
    const { browserContextId } = await command('Target.createBrowserContext');
    contexts.push(browserContextId);
    const { targetId } = await command('Target.createTarget', { url: 'about:blank', browserContextId });
    const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
    const call = (method, params) => command(method, params, sessionId);
    const evaluate = async expression => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error('Browser evaluation failed');
      return result.result.value;
    };
    const until = async (expression, label) => {
      for (let i = 0; i < 180; i++) { if (await evaluate(expression)) return; await wait(500); }
      console.log('Form error:', await evaluate(`document.querySelector('.auth-error')?.textContent || document.querySelector('.account-gate p')?.textContent || ''`));
      const screenshot = await call('Page.captureScreenshot', { format: 'png' });
      await writeFile(join(output, `failure-${width}.png`), Buffer.from(screenshot.data, 'base64'));
      throw new Error(`Timed out: ${label}; diagnostic screenshot in ${output}`);
    };
    const fill = async (selector, value) => evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await call('Runtime.enable'); await call('Network.enable');
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await call('Page.navigate', { url: base + '/account' });
    await until(`Boolean(document.querySelector('.account-gate button'))`, 'account gate');
    await evaluate(`document.querySelector('.account-gate button').click()`);
    await until(`Boolean(document.querySelector('.auth-create'))`, 'welcome');
    await evaluate(`document.querySelector(${JSON.stringify(width === 1440 ? '.auth-create' : '.auth-secondary')}).click()`);
    await until(`Boolean(document.querySelector('.auth-form input[type="email"]'))`, 'form');
    if (width === 1440) {
      await fill('.auth-form input[autocomplete="name"]', 'Nexora browser diagnostic');
      await fill('.auth-form input[type="email"]', email);
      await fill('.auth-form input[autocomplete="new-password"]', password);
      await evaluate(`document.querySelector('.auth-form button[type="submit"]').click()`);
      await until(`Boolean(document.querySelector('.auth-form input[autocomplete="current-password"]'))`, 'registration completion');
    }
    await fill('.auth-form input[type="email"]', email);
    await fill('.auth-form input[autocomplete="current-password"]', password);
    await evaluate(`document.querySelector('.auth-form button[type="submit"]').click()`);
    await until(`!document.querySelector('.auth-dialog') && !document.querySelector('.account-gate') && Boolean(document.querySelector('.account-page'))`, 'login completion');
    const check = () => evaluate(`fetch('/api/auth/me', {cache:'no-store'}).then(async r => ({status:r.status,match:r.ok && (await r.json()).email===${JSON.stringify(email)}}))`);
    assert.deepEqual(await check(), { status: 200, match: true });
    await call('Page.reload');
    await until(`Boolean(document.querySelector('.account-page')) && !document.querySelector('.account-gate') && Boolean(document.querySelector('.account-sidebar'))`, 'session after reload');
    assert.deepEqual(await check(), { status: 200, match: true });
    await evaluate(`(async()=>{const {token}=await fetch('/api/csrf',{cache:'no-store'}).then(r=>r.json()); await fetch('/api/auth/logout',{method:'POST',headers:{'X-CSRF-TOKEN':token}})})()`);
    console.log(`PASS: ${width}px independent browser login and reload`);
  }
  for (const browserContextId of contexts) await command('Target.disposeBrowserContext', { browserContextId });
} finally {
  socket?.close(); browser.kill();
}
