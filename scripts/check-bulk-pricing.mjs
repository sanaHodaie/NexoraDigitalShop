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
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map(arg => arg.value || arg.description || '').join(' '));
    }
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


  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url:base+'/admin#products'});
  await until(`document.readyState==='complete'`);
  await evaluate(`(async()=>{
    const {api,resetCsrf}=await import('/src/api/client.js');
    await api('/auth/login',{method:'POST',body:JSON.stringify({email:'browser-admin@example.test',password:'browser-test-password-123'})});resetCsrf();
  })()`);
  await command('Page.reload');
  await until(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='تغییر گروهی قیمت')`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='تغییر گروهی قیمت').click()`);
  await until(`Boolean(document.querySelector('[aria-label="برند برای تغییر قیمت"]:not(:disabled)'))`);
  await evaluate(`document.querySelector('[aria-label="برند برای تغییر قیمت"]').click()`);
  await until(`Array.from(document.querySelectorAll('[role="option"]')).some(o=>o.textContent==='Apple')`);
  await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(o=>o.textContent==='Apple').click()`);
  await evaluate(`(() => {
    const input=document.querySelector('[aria-label="درصد افزایش قیمت"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'۱۵');
    input.dispatchEvent(new Event('input',{bubbles:true}));
  })()`);
  const before=await evaluate(`(async()=>{const r=await fetch('/api/products/phone-01');return (await r.json()).price;})()`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='پیش‌نمایش قیمت‌ها').click()`);
  await until(`Boolean(document.querySelector('input[type="checkbox"]'))`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.startsWith('اعمال افزایش')).disabled`),true);
  for(const width of [320,375,768,1440]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Page overflow ${width}`);
    await writeFile(join(output,`pricing-${width}.png`),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  }
  await evaluate(`document.querySelector('input[type="checkbox"]').click()`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.startsWith('اعمال افزایش')).click()`);
  await until(`Array.from(document.querySelectorAll('[role="status"]')).some(el=>el.textContent.includes('به‌روزرسانی شد'))`);
  const after=await evaluate(`(async()=>{const r=await fetch('/api/products/phone-01',{cache:'no-store'});return (await r.json()).price;})()`);
  assert.equal(Math.round(after*600000),Math.round(before*600000*1.15));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,screenshots:output,checks:['products entry','brand filter','Persian percent','preview','explicit confirmation','actual price increase','320/375/768/1440 layout']}));
} finally {
  socket?.close();
  browser.kill();
}
