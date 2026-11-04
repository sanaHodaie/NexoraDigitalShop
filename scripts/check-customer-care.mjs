// Browser-only UI contract check; HTTP integration/security is covered by pytest.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, readFile, rm, mkdir, writeFile} from 'node:fs/promises';
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
  let id = 0, forceCrash = false;
  const row = {id:42,kind:'wholesale',status:'new',createdAt:'2026-11-04T10:00:00Z',telegramUserId:'123',telegramUsername:'test_customer',staffNote:'',version:1,details:{name:'مشتری تست',phone:'09120000000',company:'فروشگاه تست',items:'گوشی و هدفون',quantity:30,city:'تهران',address:'خیابان تست، پلاک ۱۲',notes:'استعلام عمده'}};
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
    if (message.method === 'Runtime.exceptionThrown' && !String(message.params.exceptionDetails.exception?.description).includes('Simulated page failure')) errors.push(message.params.exceptionDetails.text);
    if (message.method !== 'Fetch.requestPaused') return;
    const {request, requestId} = message.params;
    const path = new URL(request.url).pathname;
    if(path === '/src/pages/HomePage.jsx') {
      if(forceCrash) command('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'}],body:Buffer.from('export default function BrokenPage(){throw new Error("Simulated page failure")}').toString('base64')}).catch(e=>errors.push(e.message));
      else command('Fetch.continueRequest',{requestId}).catch(e=>errors.push(e.message));
      return;
    }
    let data = [], status = 200;
    if (path === '/api/auth/me') data = {email: 'test@example.com', fullName: 'Telegram UI Test', emailVerifiedAt: '2026-01-01'};
    if (path === '/api/auth/providers') data = {googleClientId: null};
    if (path === '/api/csrf') data = {token: 'fixture-csrf'};
    if(path === '/api/admin/me') data = {email:'admin@example.com',fullName:'مدیر تست',permissions:['admin:access','orders:read','orders:cancel']};
    if(path === '/api/admin/customer-requests') data = {items:[row],total:1,page:1,size:20};
    if(path === '/api/admin/customer-requests/42' && request.method === 'PATCH') {
      writes.push(request);
      Object.assign(row,JSON.parse(request.postData),{version:row.version+1});
      data = row;
    }
    command('Fetch.fulfillRequest', {requestId, responseCode: status,
      responseHeaders: [{name: 'Content-Type', value: 'application/json'}],
      ...(status === 204 ? {} : {body: Buffer.from(JSON.stringify(data)).toString('base64')})
    }).catch(e => {if(e.message !== '{"code":-32602,"message":"Invalid InterceptionId."}') errors.push(e.message);});
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
  await command('Fetch.enable', {patterns: [{urlPattern: `${ui}/api/*`},{urlPattern: `${ui}/src/pages/HomePage.jsx*`}]});
  await mkdir('/tmp/nexora-crm-shots', {recursive:true});
  for (const url of ['/this-page-does-not-exist','/category/not-a-category','/magazine/not-an-article']) {
    await command('Page.navigate', {url: ui+url});
    await until('!!document.querySelector(".nexora-error")');
    await until('document.querySelector(".error-illustration img").complete && document.querySelector(".error-illustration img").naturalWidth > 0');
    assert.ok(await evaluate('document.title.includes("مسیر پیدا نشد")'));
    assert.ok(await evaluate(`!!document.querySelector('meta[name="robots"][content*="noindex"]')`));
    for(const width of [320,390,1440]) {
      await command('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:false});
      for(const dark of [false,true]) {
        await evaluate('document.documentElement.classList.toggle("dark",'+dark+')');
        assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No error-page overflow');
        if(url.includes('this-page')) {
          const {data}=await command('Page.captureScreenshot');
          await writeFile('/tmp/nexora-crm-shots/error-'+width+'-'+dark+'.png',Buffer.from(data,'base64'));
        }
      }
    }
  }
  await command('Page.navigate',{url:ui+'/admin#customer-requests'});
  await until('document.body.innerText.includes("درخواست‌های عمده و پشتیبانی تلگرام")');
  await until('document.body.innerText.includes("خیابان تست، پلاک ۱۲")');
  assert.ok(await evaluate('document.body.innerText.includes("مشتری تست")'));
  for(const width of [390,1440]) {
    await command('Emulation.setDeviceMetricsOverride', {width,height:1000,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  }
  await evaluate('(() => {const select=document.querySelectorAll("select")[2];select.value="contacted";select.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await click('ذخیرهٔ رسیدگی');
  await until('[...document.querySelectorAll(".glass-panel header span")].some(s=>s.textContent.includes("تماس گرفته شد"))');
  assert.equal(writes.length,1);
  assert.equal(Object.entries(writes[0].headers).find(([key])=>key.toLowerCase()==='x-csrf-token')?.[1],'fixture-csrf');
  assert.equal(row.status,'contacted');
  forceCrash = true;
  await command('Page.navigate',{url:ui+'/'});
  await until('document.querySelector("#error-title")?.textContent.includes("کمی مکث")');
  forceCrash = false;
  await click('تلاش دوباره');
  await until('!!document.querySelector("#trending") && !document.querySelector(".nexora-error")');
  assert.deepEqual(errors,[]);
  console.log('PASS: illustrated 404 routes, loaded artwork, noindex, light/dark 320–1440px; admin customer/address display and status update with CSRF (API mocked).');
} finally {
  socket?.close(); chrome.kill();
  await new Promise(resolve => { if (chrome.exitCode !== null) resolve(); else chrome.once('exit', resolve); });
  await rm(output, {recursive: true, force: true, maxRetries: 10, retryDelay: 100});
}
