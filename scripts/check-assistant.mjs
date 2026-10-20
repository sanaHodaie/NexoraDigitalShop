// Local browser smoke checks against a running Vite server and seeded API.
// Requires tests/serve_management_ui.py: writes only to the isolated fixture database.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const base = process.env.NEXORA_UI_URL || 'http://127.0.0.1:3012';
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
  await command('Page.navigate', {url:base+'/'});
  await until(`Boolean(document.querySelector('[aria-label="باز کردن راهنمای خرید"]'))`);
  for (const width of [375, 768, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', {width,height:850,deviceScaleFactor:1,mobile:width<600});
    await evaluate(`document.querySelector('[aria-label="باز کردن راهنمای خرید"]').click()`);
    await until(`Boolean(document.querySelector('[aria-label="پرسش درباره محصولات"]:not(:disabled)'))`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='لپ‌تاپ برای برنامه‌نویسی').click()`);
    await evaluate(`document.querySelector('.nexora-assistant form').requestSubmit()`);
    await until(`document.querySelectorAll('.nexora-assistant article').length>0`);
    assert.equal(await evaluate(`document.querySelectorAll('.nexora-assistant article').length`),3);
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('.nexora-assistant article')).every(e=>e.innerText.includes('ریال'))`));
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),`overflow at ${width}`);
    assert.ok(await evaluate(`(()=>{const r=document.querySelector('.nexora-assistant').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;})()`));
    await until(`Array.from(document.querySelectorAll('.nexora-assistant article img')).every(i=>i.complete&&i.naturalWidth>0)`);
    await evaluate(`document.documentElement.classList.toggle('dark',${width===768})`);
    const shot=await command('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,`assistant-${width}.png`),Buffer.from(shot.data,'base64'));
    await evaluate(`document.querySelector('[aria-label="بستن راهنمای خرید"]').click()`);
  }
  // Guest add-to-cart requires an explicit click and opens existing authentication.
  await evaluate(`document.querySelector('[aria-label="باز کردن راهنمای خرید"]').click()`);
  await until(`Boolean(document.querySelector('[aria-label="پرسش درباره محصولات"]:not(:disabled)'))`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='لپ‌تاپ برای برنامه‌نویسی').click()`);
  await until(`document.querySelector('[aria-label="پرسش درباره محصولات"]').value.length>0`);
  await evaluate(`document.querySelector('.nexora-assistant form').requestSubmit()`);
  await until(`document.querySelectorAll('.nexora-assistant article').length>0`);
  await evaluate(`document.querySelector('.nexora-assistant article button').click()`);
  await until(`Boolean(document.querySelector('dialog.auth-dialog[open]'))`);
  await command('Page.navigate',{url:base+'/admin'});
  await until(`Boolean(document.querySelector('input[type="email"]'))`);
  await evaluate(`(() => {const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const [selector,value] of [['input[type="email"]','browser-admin@example.test'],['input[type="password"]','browser-test-password-123']]){const el=document.querySelector(selector);set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await until(`document.body.innerText.includes('نمایی از مسیر رشد')`);
  await evaluate(`location.hash='assistant'`);
  await until(`document.body.innerText.includes('آزمایش با محصولات واقعی')`);
  for(const width of [375,1440]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    await wait(500);
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`));
  }
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='آزمایش پاسخ').click()`);
  await until(`document.body.innerText.includes('روش پاسخ:')`);
  assert.equal(await evaluate(`Boolean(document.querySelector('[role="alert"]'))`),false);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='ذخیره تنظیمات').click()`);
  await until(`document.body.innerText.includes('آزمایش با محصولات واقعی')&&!document.body.innerText.includes('در حال ذخیره')`);
  assert.equal(await evaluate(`Boolean(document.querySelector('[role="alert"]'))`),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,screenshots:output,widths:[375,768,1440]}));
} finally { socket?.close(); browser.kill(); }
