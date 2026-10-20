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
  await command('Page.navigate',{url:base+'/admin'});
  await until(`Boolean(document.querySelector('input[type="email"]'))`);
  await evaluate(`(() => {
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    for (const [selector,value] of [['input[type="email"]','browser-admin@example.test'],['input[type="password"]','browser-test-password-123']]) {
      const input=document.querySelector(selector);set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  })()`);
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await until(`document.body.innerText.includes('نمایی از مسیر رشد')`);
  assert.equal(await evaluate(`document.body.innerText.includes('گزارشات و چارت‌ها')`),false);
  assert.equal(await evaluate(`document.body.innerText.includes('دسته‌بندی‌های فروشگاه')`),false);
  for (const width of [375,768,1440]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});
    for(const page of ['dashboard','products','orders','logs','settings']) {
      await evaluate(`location.hash=${JSON.stringify(page)}`);
      await wait(800);
      assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),`${page} overflow at ${width}`);
      assert.equal(await evaluate(`Boolean(document.querySelector('[role="alert"]'))`),false,`${page} API error`);
    }
    await evaluate(`location.hash='products'`);
    await until(`Boolean(document.querySelector('[aria-label="فیلتر دسته‌بندی محصولات"]'))`);
    await until(`document.querySelector('article img')?.complete && document.querySelector('article img')?.naturalWidth>0`);
    await evaluate(`document.querySelector('[aria-label="فیلتر دسته‌بندی محصولات"]').click()`);
    await until(`Boolean(document.querySelector('[role="listbox"]'))`);
    const screenshot=await command('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,`products-${width}.png`),Buffer.from(screenshot.data,'base64'));
    await evaluate(`Array.from(document.querySelectorAll('[role="option"]')).find(e=>e.innerText.includes('تجهیزات صوتی')).click()`);
    await until(`document.querySelectorAll('article').length>0`);
    await until(`!document.querySelector('[role="status"]') && document.querySelectorAll('article').length>0`);
    assert.ok(await evaluate(`Array.from(document.querySelectorAll('article')).every(e=>e.dataset.category==='audio')`));
  }
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.includes('محصول جدید')).click()`);
  await until(`Boolean(document.querySelector('[role="dialog"]'))`);
  assert.equal(await evaluate(`document.querySelector('input[type="file"]').accept`),'image/jpeg,image/png,image/webp');
  assert.ok(await evaluate(`document.querySelector('[role="dialog"]').innerText.includes('قیمت پایه به ریال')`));
  const uploadPath=join(output,'upload.png');
  await writeFile(uploadPath,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'));
  const documentNode=await command('DOM.getDocument');
  const fileNode=await command('DOM.querySelector',{nodeId:documentNode.root.nodeId,selector:'input[type="file"]'});
  await command('DOM.setFileInputFiles',{nodeId:fileNode.nodeId,files:[uploadPath]});
  await until(`Boolean(document.querySelector('[role="dialog"] img[src^="/api/media/"]'))`);
  await until(`document.querySelector('[role="dialog"] img').naturalWidth>0`);
  await evaluate(`document.querySelector('[aria-label="بستن"]').click();location.hash='dashboard'`);
  await until(`Boolean(document.querySelector('svg[aria-label="نمودار نمادین رشد"]'))`);
  await wait(2200);
  await evaluate(`document.documentElement.classList.add('dark');document.body.classList.add('dark')`);
  const dashboard=await command('Page.captureScreenshot',{format:'png'});
  await writeFile(join(output,'dashboard-dark.png'),Buffer.from(dashboard.data,'base64'));
  // The newsletter must prompt guests, then attribute the actual typed email.
  await evaluate(`(async()=>{const {token}=await (await fetch('/api/csrf')).json();await fetch('/api/auth/logout',{method:'POST',headers:{'X-CSRF-TOKEN':token}});})()`);
  await command('Page.navigate',{url:base+'/'});
  await until(`Boolean(document.querySelector('[aria-label="ایمیل عضویت در خبرنامه"]'))`);
  await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText==='ورود و عضویت'&&!b.disabled)`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='ورود و عضویت').click()`);
  await until(`Boolean(document.querySelector('dialog.auth-dialog[open]'))`);
  await evaluate(`document.querySelector('[aria-label="بستن پنجره ورود"]').click()`);
  await evaluate(`(async()=>{const {token}=await (await fetch('/api/csrf')).json();const response=await fetch('/api/auth/login',{method:'POST',headers:{'X-CSRF-TOKEN':token,'Content-Type':'application/json'},body:JSON.stringify({email:'browser-admin@example.test',password:'browser-test-password-123'})});if(!response.ok)throw Error('fixture login failed');})()`);
  await command('Page.navigate',{url:base+'/'});
  await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText==='عضویت'&&!b.disabled)`);
  await evaluate(`(()=>{const input=document.querySelector('[aria-label="ایمیل عضویت در خبرنامه"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'newsletter-browser@example.test');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(`document.querySelector('[aria-label="ایمیل عضویت در خبرنامه"]').form.requestSubmit()`);
  await until(`document.body.innerText.includes('عضویت شما در خبرنامه ثبت شد.')`);
  await command('Page.navigate',{url:base+'/admin#messages'});
  await until(`document.body.innerText.includes('newsletter-browser@example.test')`);
  assert.ok(await evaluate(`document.body.innerText.includes('browser-admin@example.test')`));
  assert.deepEqual(errors,[],'No runtime exceptions');
  console.log('Admin navigation, filters, image upload, rial labels, responsive layouts and authenticated newsletter passed. Screenshots:',output);
} finally {
  if(socket)socket.close();
  browser.kill();
}
