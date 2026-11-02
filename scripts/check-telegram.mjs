// Browser-only UI contract check; HTTP integration/security is covered by pytest.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const ui = process.env.NEXORA_UI_URL || 'http://127.0.0.1:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(ui).hostname));
const output = await mkdtemp(join(tmpdir(), 'nexora-telegram-ui-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${output}`, '--no-first-run', 'about:blank'];
if (process.env.NEXORA_CHROME_NO_SANDBOX === '1') args.unshift('--no-sandbox');
const chrome = spawn(process.env.NEXORA_CHROME || 'chromium', args, {stdio: 'ignore'});
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = (await readFile(join(output, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(100); }
  }
  assert.ok(port, 'Chromium started');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0, linked = false, failStatus = false;
  const pending = new Map(), errors = [], writes = [];
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const call = ++id;
      const timeout = setTimeout(() => { pending.delete(call); reject(new Error(`Timeout: ${method}`)); }, 15000);
      pending.set(call, response => { clearTimeout(timeout); response.error ? reject(new Error(JSON.stringify(response.error))) : resolve(response.result); });
      socket.send(JSON.stringify({id: call, method, params}));
    });
  }
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method !== 'Fetch.requestPaused') return;
    const {request, requestId} = message.params;
    const path = new URL(request.url).pathname;
    let data = [], status = 200;
    if (path === '/api/auth/me') data = {email: 'test@example.com', fullName: 'Telegram UI Test', emailVerifiedAt: '2026-01-01'};
    if (path === '/api/auth/providers') data = {googleClientId: null};
    if (path === '/api/csrf') data = {token: 'fixture-csrf'};
    if (path === '/api/account/telegram') {
      if (request.method === 'DELETE') { linked = false; status = 204; writes.push(request); }
      else if (failStatus) { status = 503; data = {error: 'خطای تست اتصال'}; }
      else data = {linked, configured: true};
    }
    if (path === '/api/account/telegram/link') {
      writes.push(request);
      data = {url: 'https://t.me/NexoraTestBot?start=fixture-token', expiresAt: '2026-11-02T20:00:00Z'};
    }
    command('Fetch.fulfillRequest', {requestId, responseCode: status,
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      ...(status === 204 ? {} : {body: Buffer.from(JSON.stringify(data)).toString('base64')})
    }).catch(e => errors.push(e.message));
  };
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function until(expression) {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
    throw new Error(`Condition failed: ${expression}`);
  }
  async function click(text) {
    await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)}); if (!button || button.disabled) throw new Error('Button unavailable'); button.click(); })()`);
  }
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Network.setBlockedURLs', {urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*', 'https://images.unsplash.com/*']});
  await command('Fetch.enable', {patterns: [{urlPattern: `${ui}/api/*`}]});
  await command('Page.navigate', {url: `${ui}/account`});
  await until('!!document.querySelector(".account-content")');
  await click('اطلاعات شخصی');
  await until('[...document.querySelectorAll("button")].some(b => b.textContent === "دریافت لینک اتصال" && !b.disabled)');
  await click('دریافت لینک اتصال');
  await until('!!document.querySelector(\'a[href^="https://t.me/"]\')');
  assert.equal(await evaluate('document.querySelector(\'a[href^="https://t.me/"]\').href'), 'https://t.me/NexoraTestBot?start=fixture-token');
  for (const width of [320, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: false});
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `No overflow at ${width}`);
  }
  linked = true;
  await click('بررسی وضعیت اتصال');
  await until('document.body.innerText.includes("حساب تلگرام شما متصل است.")');
  assert.equal(await evaluate('!!document.querySelector(\'a[href^="https://t.me/"]\')'), false);
  await click('قطع اتصال تلگرام');
  await until('[...document.querySelectorAll("button")].some(b => b.textContent === "دریافت لینک اتصال" && !b.disabled)');
  failStatus = true;
  await click('بررسی وضعیت اتصال');
  await until('document.body.innerText.includes("خطای تست اتصال")');
  failStatus = false;
  await click('بررسی وضعیت اتصال');
  await until('!document.body.innerText.includes("خطای تست اتصال")');
  assert.equal(writes.length, 2);
  for (const request of writes) assert.equal(Object.entries(request.headers).find(([key]) => key.toLowerCase() === 'x-csrf-token')?.[1], 'fixture-csrf');
  assert.deepEqual(errors, []);
  console.log('PASS: Telegram link, status refresh, unlink, CSRF headers, error/retry, mobile/desktop UI (mocked API).');
} finally {
  socket?.close(); chrome.kill();
  await new Promise(resolve => { if (chrome.exitCode !== null) resolve(); else chrome.once('exit', resolve); });
  await rm(output, {recursive: true, force: true});
}
