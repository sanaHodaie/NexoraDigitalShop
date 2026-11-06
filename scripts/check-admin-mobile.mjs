// Expo web UI smoke test; API responses are fixtures, no live customer or Telegram traffic.
// Start apps/admin-mobile with EXPO_PUBLIC_API_URL=http://localhost:8000 and port 8089 first.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ui = process.env.NEXORA_MOBILE_UI || 'http://localhost:8089';
const apiRoot = process.env.NEXORA_MOBILE_API || 'http://localhost:8000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(ui).hostname));
const output = await mkdtemp(join(tmpdir(), 'nexora-mobile-ui-'));
const spreadsheetFixture = join(output, 'fixture-products.xlsx');
await writeFile(spreadsheetFixture, Buffer.from('PK\x03\x04fixture spreadsheet bytes')); // Parser validity is covered by real backend XLSX tests.
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${output}`, '--no-first-run', 'about:blank'];
if (process.env.NEXORA_CHROME_NO_SANDBOX === '1') args.unshift('--no-sandbox');
if (new URL(ui).protocol === 'https:') args.unshift('--ignore-certificate-errors'); // Local, ephemeral preview certificate only.
const chrome = spawn(process.env.NEXORA_CHROME || 'chromium', args, { stdio: 'ignore' });
let socket;
const manager = { id: 1, email: 'admin@example.test', name: 'مدیر آزمایشی', permissions: [
  'admin:access', 'dashboard:read', 'orders:read', 'orders:cancel', 'orders:confirm_payment', 'products:read', 'products:write', 'users:read', 'audit:read', 'subscribers:read', 'content:read', 'content:write', 'assistant:read', 'assistant:write',
] };
const row = { id: 42, kind: 'wholesale', status: 'new', version: 1, staffNote: '',
  telegramUserId: '12345', telegramUsername: 'fixture', createdAt: '2026-11-06T08:00:00Z', updatedAt: '2026-11-06T08:00:00Z',
  hasInvoice: false, trackingCode: null, invoice: null, deliveryStatus: 'none',
  details: { name: 'مشتری آزمایشی', phone: '09123456789', company: 'فروشگاه تست', items: 'گوشی آزمایشی', quantity: 10,
    city: 'تهران', address: 'خیابان تست، پلاک ۱۲', notes: '' } };
const product = { id: 'phone-test', name: 'گوشی تست', nameEn: 'Test phone', category: 'smartphones', categoryFa: 'گوشی هوشمند',
  brand: 'Test', description: 'توضیح محصول در سایت', specs: ['رم ۸ گیگ'], image: '/assets/products/phone-01.webp', price: 100, stock: 3, isActive: true };
let unread = 2, productWrites = 0, priceWrites = 0, imports = 0;
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
    if (message.method === 'Page.javascriptDialogOpening') command('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    if (message.method === 'Page.fileChooserOpened') command('DOM.setFileInputFiles', { files: [spreadsheetFixture], backendNodeId: message.params.backendNodeId }).catch(e => errors.push(e.message));
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Network.loadingFailed') console.log('Network diagnostic:', message.params.errorText, message.params.corsErrorStatus || '');
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') console.log('Browser diagnostic:', message.params.entry.text);
    if (message.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = message.params;
    const path = new URL(request.url).pathname;
    if (path.startsWith('/assets/')) {
      command('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/svg+xml' }],
        body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="120"><rect x="25" y="5" width="52" height="110" rx="12" fill="#2454a3"/><rect x="30" y="13" width="42" height="90" rx="7" fill="#9ebfff"/></svg>').toString('base64') });
      return;
    }
    let data = {}, status = 200;
    const auth = Object.entries(request.headers).find(([key]) => key.toLowerCase() === 'authorization')?.[1];
    if (request.method === 'OPTIONS') status = 204;
    else if (path === '/health' || path === '/api/mobile/health') data = { status: 'ok', mobileVersion: 2 };
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
    } else if (path === '/api/admin/products') data = { items: [product], total: 1, page: 1 };
    else if (path === '/api/admin/products/filters') data = { categories: [{ id: 'smartphones', title: 'گوشی هوشمند' }, { id: 'audio', title: 'تجهیزات صوتی' }], kinds: { smartphones: ['گوشی'], audio: ['هندزفری'] } };
    else if (path === '/api/admin/products/phone-test') { if (request.method === 'PUT') { productWrites++; const body = JSON.parse(request.postData); Object.assign(product, body, { price: body.priceRial / 600000 }); } data = product; }
    else if (path === '/api/admin/products/pricing/brands') data = { items: ['Test'] };
    else if (path === '/api/admin/products/pricing') { const body = JSON.parse(request.postData); if (body.snapshot) priceWrites++;
      data = { snapshot: 'fixture-snapshot', total: 1, changed: 1, applied: !!body.snapshot, items: [{ id: product.id, name: product.name, oldPriceRial: 60000000, newPriceRial: 66000000 }] }; }
    else if (path === '/api/admin/products/import') {
      imports++;
      assert.ok(Object.entries(request.headers).some(([k, v]) => k.toLowerCase() === 'content-type' && v === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
      const commit = new URL(request.url).searchParams.get('commit') === 'true';
      data = { items: [{ id: 'excel-test', name: 'محصول اکسل آزمایشی', row: 2 }], errors: [], canImport: !commit, created: commit ? 1 : 0 };
    }
    else if (path === '/api/admin/newsletter-notifications') data = { unread, latestId: 2, items: [{ id: 2, email: 'newsletter@example.test', name: 'عضو جدید', createdAt: row.createdAt, unread: !!unread }] };
    else if (path === '/api/admin/newsletter-notifications/read') { unread = 0; status = 204; }
    else if (path === '/api/admin/subscribers') data = { total: 1, items: [{ id: 2, email: 'newsletter@example.test', fullName: 'عضو جدید', createdAt: row.createdAt }] };
    else if (path === '/api/admin/activity') data = { items: [] };
    else if (path === '/api/admin/orders') data = { items: [{ id: 7, name: 'خریدار سایت', email: 'buyer@example.test', status: 'paid', createdAt: row.createdAt, total: 100, lines: [] }], total: 1, page: 1 };
    else if (path === '/api/admin/orders/7') data = { id: 7, status: 'paid', createdAt: row.createdAt, email: 'buyer@example.test',
      shippingAddress: { recipient: 'خریدار سایت', address: 'نشانی کامل سفارش سایت', postalCode: '1234567890', phone: '09123456789' },
      subtotalRial: 60000000, shippingRial: 0, totalRial: 60000000, lines: [{ productId: 'phone-test', name: 'گوشی تست', quantity: 1, unitPriceRial: 60000000, totalRial: 60000000 }] };
    else if (path === '/api/admin/audit') data = { items: [{ id: 1, event: 'wholesale_approved', createdAt: row.createdAt, subjectId: '42', email: manager.email }], hasMore: false };
    else if (path === '/api/admin/users') data = { items: [], total: 0, page: 1 };
    else { status = 404; data = { error: 'Fixture route missing: ' + path }; }
    command('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [
      { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: new URL(ui).origin },
      { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
      { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
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
  async function trustedClick(text) {
    await wait(600);
    const point = await evaluate(`(() => {const b=[...document.querySelectorAll('button,[role="button"]')].find(x=>x.textContent.trim()===${JSON.stringify(text)});b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  }
  async function input(label, value) { await evaluate(`(() => {const e=document.querySelector('input[aria-label=${JSON.stringify(label)}],textarea[aria-label=${JSON.stringify(label)}]');if(!e)throw new Error('Missing input');const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`); }
  await command('Page.enable'); await command('Page.setInterceptFileChooserDialog', { enabled: true }); await command('Runtime.enable'); await command('Network.enable'); await command('Log.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: `${apiRoot}/api/*` }, { urlPattern: `${apiRoot}/health` }, { urlPattern: 'https://nexora-digital-shop.vercel.app/assets/*' }] });
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await command('Page.navigate', { url: ui });
  await until(`document.body.innerText.includes('ورود مدیران')`);
  await mkdir('/tmp/nexora-mobile-shots', { recursive: true });
  await writeFile('/tmp/nexora-mobile-shots/login-glass.png', Buffer.from((await command('Page.captureScreenshot')).data, 'base64'));
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
  assert.ok(await evaluate(`document.body.innerText.includes('توضیح محصول در سایت')`));
  await click('ویرایش محصول'); await until(`document.body.innerText.includes('توضیحات محصول در سایت')`);
  await input('توضیحات محصول در سایت', 'توضیح ویرایش‌شده'); await click('ذخیرهٔ محصول'); await until(`document.body.innerText.includes('محصول با موفقیت ذخیره شد.')`);
  assert.equal(productWrites, 1); assert.equal(product.description, 'توضیح ویرایش‌شده');
  await evaluate(`document.querySelector('[aria-label="بازگشت"]').click()`);
  await click('تغییر قیمت گروهی'); await until(`document.body.innerText.includes('پیش‌نمایش قیمت‌ها')`);
  await click('پیش‌نمایش قیمت‌ها'); await until(`document.body.innerText.includes('بازبینی پیش از اعمال')`);
  assert.equal(priceWrites, 0); await click('تأیید افزایش برای ۱ محصول'); await until(`document.body.innerText.includes('تغییر قیمت اعمال شد')`); assert.equal(priceWrites, 1);
  await evaluate(`document.querySelector('[aria-label="بازگشت"]').click()`);
  await click('ورود از اکسل'); await until(`document.body.innerText.includes('انتخاب فایل و پیش‌نمایش')`);
  await trustedClick('انتخاب فایل و پیش‌نمایش'); await until(`document.body.innerText.includes('محصول اکسل آزمایشی')`); assert.equal(imports, 1);
  await click('تأیید نهایی و ثبت محصولات'); await until(`document.body.innerText.includes('محصول ثبت شد.')`); assert.equal(imports, 2);
  await evaluate(`document.querySelector('[aria-label="بازگشت"]').click()`);
  for (const width of [320, 390, 1024]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `No overflow at ${width}`);
  }
  await click('رویدادها'); await until(`document.body.innerText.includes('تأیید عمده و صدور فاکتور')`);
  await click('حساب'); await until(`document.body.innerText.includes('حساب مدیریت')`);
  await click('تیره'); await until(`document.documentElement.style.colorScheme==='dark'`);
  await click('محصولات'); await until(`document.body.innerText.includes('ویترین محصولات')`);
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await wait(700);
  if (new URL(ui).pathname.startsWith('/business')) await until(`[...document.images].some(x=>x.alt==='گوشی تست'&&x.complete&&x.naturalWidth>0)`);
  const tabGeometry = await evaluate(`[...document.querySelectorAll('[role="tab"]')].map(x=>({label:x.getAttribute('aria-label'),top:x.getBoundingClientRect().top,bottom:x.getBoundingClientRect().bottom}))`);
  assert.ok(tabGeometry.length === 5 && tabGeometry.every(x => x.top >= 0 && x.bottom <= 844), 'Bottom navigation stays inside the viewport');
  assert.ok(await evaluate(`[...document.querySelectorAll('[role="tab"]')].every(x=>{const r=x.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[role="tab"]')===x;})`), 'Bottom tabs are visible and receive pointer input');
  await writeFile('/tmp/nexora-mobile-shots/products-dark.png', Buffer.from((await command('Page.captureScreenshot')).data, 'base64'));
  await writeFile('/tmp/nexora-mobile-shots/navigation.png', Buffer.from((await command('Page.captureScreenshot', { clip: { x: 0, y: 730, width: 390, height: 114, scale: 1 } })).data, 'base64'));
  await click('حساب'); await click('روشن');
  await click('خبرنامه و اعلان‌ها'); await until(`document.body.innerText.includes('newsletter@example.test')`); await until(`document.body.innerText.includes('ایمیل خبرنامه')`);
  await until(`!!document.querySelector('[aria-label="اعلان‌های خبرنامه، 0 خوانده‌نشده"]')`); assert.equal(unread, 0);
  await evaluate(`document.querySelector('[aria-label="بازگشت"]').click()`);
  await click('سفارش‌های سایت'); await until(`document.body.innerText.includes('خریدار سایت')`); await click('جزئیات سفارش و فاکتور');
  await until(`document.body.innerText.includes('نشانی کامل سفارش سایت')`); assert.ok(await evaluate(`document.body.textContent.includes('دانلود فاکتور PDF')`));
  await evaluate(`document.querySelector('[aria-label="بازگشت"]').click()`); await evaluate(`document.querySelector('[aria-label="بازگشت"]').click()`);
  await click('خروج از حساب'); await click('تأیید خروج'); await until(`document.body.innerText.includes('ورود مدیران')`);
  assert.equal(logins, 2);
  assert.deepEqual(errors, []);
  console.log('PASS: glass login, sessions, wholesale approval, product edit, bulk pricing preview/confirm, XLSX file picker and import confirmation, audit, dark/light theme, newsletter read badge, full site order detail, logout and responsive widths. API mocked; no Telegram send.');
} finally {
  socket?.close(); chrome.kill();
  await new Promise(resolve => { if (chrome.exitCode !== null) resolve(); else chrome.once('exit', resolve); });
  await rm(output, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
