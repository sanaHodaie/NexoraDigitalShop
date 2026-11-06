// Expo web UI smoke test; API responses are fixtures, no live customer or Telegram traffic.
// Start apps/admin-mobile with EXPO_PUBLIC_API_URL=http://localhost:8000 and port 8089 first.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ui = process.env.NEXORA_MOBILE_UI || 'http://localhost:8089';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(ui).hostname));
const output = await mkdtemp(join(tmpdir(), 'nexora-mobile-ui-'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${output}`, '--no-first-run', 'about:blank'];
if (process.env.NEXORA_CHROME_NO_SANDBOX === '1') args.unshift('--no-sandbox');
const chrome = spawn(process.env.NEXORA_CHROME || 'chromium', args, { stdio: 'ignore' });
let socket;
const manager = { id: 1, email: 'admin@example.test', name: 'مدیر آزمایشی', permissions: [
  'admin:access', 'dashboard:read', 'orders:read', 'orders:cancel', 'orders:confirm_payment', 'products:read', 'users:read', 'audit:read',
] };
const row = { id: 42, kind: 'wholesale', status: 'new', version: 1, staffNote: '',
  telegramUserId: '12345', telegramUsername: 'fixture', createdAt: '2026-11-06T08:00:00Z', updatedAt: '2026-11-06T08:00:00Z',
  hasInvoice: false, trackingCode: null, invoice: null, deliveryStatus: 'none',
  details: { name: 'مشتری آزمایشی', phone: '09123456789', company: 'فروشگاه تست', items: 'گوشی آزمایشی', quantity: 10,
    city: 'تهران', address: 'خیابان تست، پلاک ۱۲', notes: '' } };
try {
  let port;
  for (let i = 0; i < 100; i++) { try { port = (await readFile(join(output, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await wait(100); } }
  assert.ok(port, 'Chromium started');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let next = 0, approved = 0, logins = 0;
  const pending = new Map(), errors = [];
  function command(method, params = {}) { return new Promise((resolve, reject) => {
    const id = ++next;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout ${method}`)); }, 30000);
    pending.set(id, response => { clearTimeout(timeout); response.error ? reject(new Error(JSON.stringify(response.error))) : resolve(response.result); });
    socket.send(JSON.stringify({ id, method, params }));
  }); }
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.loadingFailed') console.log('Network diagnostic:', message.params.errorText, message.params.corsErrorStatus || '');
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') console.log('Browser diagnostic:', message.params.entry.text);
    if (message.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = message.params;
    const path = new URL(request.url).pathname;
    let data = {}, status = 200;
    const auth = Object.entries(request.headers).find(([key]) => key.toLowerCase() === 'authorization')?.[1];
    if (request.method === 'OPTIONS') status = 204;
    else if (path === '/health') data = { status: 'ok' };
    else if (path === '/api/mobile/session' && request.method === 'POST') {
      logins++;
      const body = JSON.parse(request.postData);
      assert.equal(body.email, manager.email);
      if (body.password !== 'test-password-12345') { status = 401; data = { error: 'ایمیل یا رمز عبور نادرست است.', code: 'INVALID_CREDENTIALS' }; }
      else data = { token: 'fixture-mobile-session', manager };
    } else if (auth !== 'Bearer fixture-mobile-session') { status = 401; data = { code: 'UNAUTHENTICATED' }; }
    else if (path === '/api/mobile/session') { if (request.method === 'DELETE') status = 204; else data = manager; }
    else if (path === '/api/admin/dashboard') data = { products: 114, users: 2, orders: 0, revenue: 0, subscribers: 0, lowStock: 1, daily: [], statuses: {} };
    else if (path === '/api/admin/customer-request-stats') data = { total: 1, statuses: { [row.status]: 1 }, daily: [{ day: '2026-11-05', requests: 0 }, { day: '2026-11-06', requests: 1 }] };
    else if (path === '/api/admin/customer-requests') data = { items: [row], total: 1, page: 1, size: 20 };
    else if (path === '/api/admin/customer-requests/42') {
      if (request.method === 'PATCH') { Object.assign(row, JSON.parse(request.postData), { version: row.version + 1 }); }
      data = row;
    } else if (path === '/api/admin/customer-requests/42/approve') {
      approved++;
      const body = JSON.parse(request.postData);
      assert.equal(body.lines[0].unitPriceRial, 25000000);
      assert.equal(body.lines[0].quantity, 10);
      Object.assign(row, { status: 'approved', version: row.version + 1, hasInvoice: true, trackingCode: '12345678', deliveryStatus: 'pending',
        invoice: { totalRial: '250000000', lines: body.lines, shippingRial: '0', terms: '' } });
      data = row;
    } else if (path === '/api/admin/products') data = { items: [{ id: 'phone-test', name: 'گوشی تست', category: 'smartphones', price: 100, stock: 3, isActive: true }], total: 1, page: 1 };
    else if (path === '/api/admin/orders') data = { items: [], total: 0, page: 1 };
    else if (path === '/api/admin/audit') data = { items: [{ id: 1, event: 'wholesale_approved', createdAt: row.createdAt, subjectId: '42', email: manager.email }], hasMore: false };
    else if (path === '/api/admin/users') data = { items: [], total: 0, page: 1 };
    else { status = 404; data = { error: 'Fixture route missing: ' + path }; }
    command('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [
      { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: ui },
      { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
      { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, DELETE, OPTIONS' },
    ], ...(status === 204 ? {} : { body: Buffer.from(JSON.stringify(data)).toString('base64') }) }).catch(e => errors.push(e.message));
  };
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function until(expression) {
    for (let i = 0; i < 250; i++) { if (await evaluate(expression)) return; await wait(150); }
    throw new Error(`Condition failed: ${expression}; page: ${await evaluate('document.body.innerText.slice(-1500)')}`);
  }
  async function click(text) { await evaluate(`(() => {const b=[...document.querySelectorAll('button,[role="button"],[role="tab"]')].find(x=>x.getAttribute('aria-label')===${JSON.stringify(text)}||x.textContent.trim()===${JSON.stringify(text)});if(!b)throw new Error('Missing button: '+${JSON.stringify(text)});b.click();})()`); }
  async function input(label, value) { await evaluate(`(() => {const e=document.querySelector('input[aria-label=${JSON.stringify(label)}],textarea[aria-label=${JSON.stringify(label)}]');if(!e)throw new Error('Missing input');const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`); }
  await command('Runtime.enable'); await command('Network.enable'); await command('Log.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: 'http://localhost:8000/api/*' }, { urlPattern: 'http://localhost:8000/health' }] });
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await command('Page.navigate', { url: ui });
  await until(`document.body.innerText.includes('ورود مدیران')`);
  await input('ایمیل', manager.email); await input('رمز عبور', 'wrong-password'); await click('ورود به مرکز مدیریت');
  await until(`document.body.innerText.includes('ایمیل یا رمز عبور نادرست است.')`);
  await input('رمز عبور', 'test-password-12345'); await click('ورود به مرکز مدیریت');
  await until(`document.body.innerText.includes('نمای امروز کسب‌وکار')`);
  await until(`document.body.innerText.includes('روند درخواست‌های تلگرام')`);
  await mkdir('/tmp/nexora-mobile-shots', { recursive: true });
  await writeFile('/tmp/nexora-mobile-shots/home.png', Buffer.from((await command('Page.captureScreenshot')).data, 'base64'));
  await click('درخواست‌ها'); await until(`document.body.innerText.includes('مشتری آزمایشی')`);
  await evaluate(`document.querySelector('[aria-label="مشاهدهٔ درخواست 42، مشتری آزمایشی"]').click()`);
  await until(`document.body.innerText.includes('خیابان تست، پلاک ۱۲')`);
  await input('یادداشت داخلی؛ برای مشتری نمایش داده نمی‌شود', 'پیگیری فردا');
  await click('ذخیرهٔ رسیدگی'); await until(`document.body.innerText.includes('تغییرات ذخیره شد.')`);
  assert.equal(row.staffNote, 'پیگیری فردا');
  await input('قیمت واحد (ریال)', '۲۵۰۰۰۰۰۰');
  await click('بازبینی فاکتور پیش از تأیید'); await until(`document.body.innerText.includes('بازبینی نهایی')`);
  assert.equal(approved, 0, 'Preview does not approve');
  await click('تأیید نهایی و ارسال به تلگرام'); await until(`document.body.innerText.includes('12345678')`);
  assert.equal(approved, 1);
  await until(`[...document.querySelectorAll('[role="button"],button')].some(x=>x.textContent.includes('فاکتور PDF'))`);
  await evaluate(`document.querySelectorAll('div').forEach(e=>{if(e.scrollHeight>e.clientHeight+100&&getComputedStyle(e).overflowY==='auto')e.scrollTop=e.scrollHeight;})`);
  await writeFile('/tmp/nexora-mobile-shots/approved.png', Buffer.from((await command('Page.captureScreenshot')).data, 'base64'));
  await evaluate(`document.querySelector('[aria-label="بازگشت"]').click()`); await click('محصولات'); await until(`document.body.innerText.includes('گوشی تست')`);
  for (const width of [320, 390, 1024]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `No overflow at ${width}`);
  }
  await click('رویدادها'); await until(`document.body.innerText.includes('تأیید عمده و صدور فاکتور')`);
  await click('حساب'); await until(`document.body.innerText.includes('حساب مدیریت')`);
  await click('خروج از حساب'); await click('تأیید خروج'); await until(`document.body.innerText.includes('ورود مدیران')`);
  assert.equal(logins, 2);
  assert.deepEqual(errors, []);
  console.log('PASS: Expo UI failed/successful login, real-shaped dashboard, request detail, note save, Persian-price preview/approval, PDF action, products, audit, logout and responsive widths. API mocked; no Telegram send.');
} finally {
  socket?.close(); chrome.kill();
  await new Promise(resolve => { if (chrome.exitCode !== null) resolve(); else chrome.once('exit', resolve); });
  await rm(output, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
