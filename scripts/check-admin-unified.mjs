// Unified /admin browser regression: fixture API only, no real customer data or Telegram sends.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ui = process.env.NEXORA_ADMIN_UI || 'http://127.0.0.1:8093/admin';
const apiRoot = new URL(ui).origin;
assert.ok(['localhost', '127.0.0.1'].includes(new URL(ui).hostname));
const output = await mkdtemp(join(tmpdir(), 'nexora-admin-ui-'));
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
let unread = 2, productWrites = 0, priceWrites = 0, imports = 0, logged = false, exports = [], contentWrites = 0, assistantWrites = 0;
const content = Object.fromEntries(Object.entries(JSON.parse(await readFile(new URL('../backend/data/site-content.json', import.meta.url),'utf8'))).map(([k,v])=>[k,{version:1,data:v}]));
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
    let data = {}, status = 200, mime = 'application/json', binary;
    if (path === '/api/health') data={status:'ok'};
    else if (path === '/api/csrf') data = {token:'fixture-csrf'};
    else if (path === '/api/auth/login') {
      assert.ok(Object.entries(request.headers).some(([k,v])=>k.toLowerCase()==='x-csrf-token'&&v==='fixture-csrf'));
      logins++;const body=JSON.parse(request.postData);
      if(body.email!==manager.email||body.password!=='test-password-12345'){status=401;data={error:'ایمیل یا رمز عبور نادرست است.',code:'INVALID_CREDENTIALS'};}
      else {logged=true;data={ok:true};}
    } else if (!logged) {status=401;data={error:'ابتدا وارد شوید.'};}
    else if (request.method!=='GET'&&!Object.entries(request.headers).some(([k,v])=>k.toLowerCase()==='x-csrf-token'&&v==='fixture-csrf')) {
      status=400;data={error:'Missing browser CSRF'};
    }
    else if (path === '/api/auth/logout') {logged=false;status=204;}
    else if (path === '/api/admin/me') data=manager;
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
        invoice: { approvedAt: row.updatedAt, subtotalRial: '250000000', totalRial: '250000000', lines: body.lines.map(line=>({...line,unitPriceRial:String(line.unitPriceRial),totalRial:String(BigInt(line.quantity)*BigInt(line.unitPriceRial))})), shippingRial: '0', terms: '' } });
      data = row;
    } else if (path === '/api/admin/products') data = { items: [product, { ...product, id: 'phone-second', name: 'گوشی دوم' }], total: 2, page: 1, pageSize:20 };
    else if (path === '/api/admin/products/filters') data = { categories: [{ id: 'smartphones', title: 'گوشی هوشمند' }, { id: 'audio', title: 'تجهیزات صوتی' }], kinds: { smartphones: ['گوشی'], audio: ['هندزفری'] } };
    else if (path === '/api/admin/products/phone-test') { if (request.method === 'PUT') { productWrites++; const body = JSON.parse(request.postData); Object.assign(product, body, { price: body.priceRial / 600000 }); } data = product; }
    else if (path === '/api/admin/products/pricing/brands') data = { items: ['Test'] };
    else if (path === '/api/admin/products/pricing') { const body = JSON.parse(request.postData); if (body.snapshot) priceWrites++;
      data = { snapshot: 'fixture-snapshot', category:body.category, brand:body.brand, percent:body.percent, total: 1, changed: 1, applied: !!body.snapshot, items: [{ id: product.id, name: product.name, oldPriceRial: 60000000, newPriceRial: 66000000 }] }; }
    else if (path === '/api/admin/products/import') {
      imports++;
      assert.ok(Object.entries(request.headers).some(([k, v]) => k.toLowerCase() === 'content-type' && v === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
      const commit = new URL(request.url).searchParams.get('commit') === 'true';
      data = { items: [{ id: 'excel-test', name: 'محصول اکسل آزمایشی', row: 2 }], errors: [], canImport: !commit, created: commit ? 1 : 0 };
    }
    else if (path === '/api/admin/audit/export' || path === '/api/admin/orders/7/invoice.pdf') {
      if(path.endsWith('.pdf')) {mime='application/pdf';binary=Buffer.from('%PDF-1.4 fixture');}
      else {const format=new URL(request.url).searchParams.get('format');exports.push(format);mime=format==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';binary=Buffer.from('PK fixture office bytes');}
    }
    else if (path === '/api/admin/content') data=content;
    else if (path.startsWith('/api/admin/content/')) {contentWrites++;const key=path.split('/').at(-1);const body=JSON.parse(request.postData);content[key]={version:body.version+1,data:body.data};data=content[key];}
    else if (path === '/api/admin/assistant') {if(request.method==='PUT')assistantWrites++;data={version:1,configured:false,provider:'catalogue',model:'fixture',data:{enabled:true,useModel:false,greeting:'سلام',maxRecommendations:3,dailyLimit:100}};}
    else if (path === '/api/admin/assistant/test') data={text:'پاسخ آزمایشی کاتالوگ',products:[]};
    else if (path === '/api/admin/newsletter-notifications') data = { unread, latestId: 2, items: [{ id: 2, email: 'newsletter@example.test', name: 'عضو جدید', createdAt: row.createdAt, unread: !!unread }] };
    else if (path === '/api/admin/newsletter-notifications/read') { unread = 0; status = 204; }
    else if (path === '/api/admin/subscribers') data = { total: 1, items: [{ id: 2, email: 'newsletter@example.test', fullName: 'عضو جدید', createdAt: row.createdAt }] };
    else if (path === '/api/admin/activity') data = { items: [] };
    else if (path === '/api/admin/order-register') {
      const source=new URL(request.url).searchParams.get('source');
      const site={id:7,source:'site',name:'خریدار سایت',email:'buyer@example.test',status:'paid',createdAt:row.createdAt,totalRial:'60000000'};
      const telegram={id:row.id,source:'telegram',name:row.details.name,phone:row.details.phone,status:'approved',trackingCode:row.trackingCode,createdAt:row.updatedAt,totalRial:row.invoice.totalRial};
      const items=source==='site'?[site]:source==='telegram'?[telegram]:[site,telegram];data={items,total:items.length,page:1,pageSize:24};
    }
    else if (path === '/api/admin/orders/7') data = { id: 7, status: 'paid', createdAt: row.createdAt, email: 'buyer@example.test',
      shippingAddress: { recipient: 'خریدار سایت', address: 'نشانی کامل سفارش سایت', postalCode: '1234567890', phone: '09123456789' },
      subtotalRial: 60000000, shippingRial: 0, totalRial: 60000000, lines: [{ productId: 'phone-test', name: 'گوشی تست', quantity: 1, unitPriceRial: 60000000, totalRial: 60000000 }] };
    else if (path === '/api/admin/audit') data = { items: [{ id: 1, event: 'wholesale_approved', createdAt: row.createdAt, subjectId: '42', email: manager.email }], hasMore: false };
    else if (path === '/api/admin/users') data = { items: [], total: 0, page: 1 };
    else { status = 404; data = { error: 'Fixture route missing: ' + path }; }
    command('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [
      { name: 'Content-Type', value: mime }, { name: 'Access-Control-Allow-Origin', value: new URL(ui).origin },
      { name: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
      { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
    ], ...(status === 204 ? {} : { body: (binary||Buffer.from(JSON.stringify(data))).toString('base64') }) }).catch(e => errors.push(e.message));
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
  async function click(text) { await until(`[...document.querySelectorAll('button,[role="button"],[role="tab"]')].some(x=>(x.getAttribute('aria-label')===${JSON.stringify(text)}||x.textContent.trim()===${JSON.stringify(text)})&&!x.disabled)`); await evaluate(`(() => {const b=[...document.querySelectorAll('button,[role="button"],[role="tab"]')].find(x=>x.getAttribute('aria-label')===${JSON.stringify(text)}||x.textContent.trim()===${JSON.stringify(text)});if(!b)throw new Error('Missing button: '+${JSON.stringify(text)});b.click();})()`); }
  async function trustedClick(text) {
    await wait(600);
    const point = await evaluate(`(() => {const b=[...document.querySelectorAll('button,[role="button"]')].find(x=>x.getAttribute('aria-label')===${JSON.stringify(text)}||x.textContent.trim()===${JSON.stringify(text)});b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  }
  async function input(label, value) { await evaluate(`(() => {let e=document.querySelector('input[aria-label=${JSON.stringify(label)}],textarea[aria-label=${JSON.stringify(label)}]');if(!e)e=[...document.querySelectorAll('label')].find(x=>x.querySelector('span')?.textContent.trim()===${JSON.stringify(label)})?.querySelector('input,textarea');if(!e)throw new Error('Missing input '+${JSON.stringify(label)});const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`); }
  const navigate=async(hash,text)=>{await evaluate(`location.hash=${JSON.stringify(hash)}`);await until(`document.body.innerText.includes(${JSON.stringify(text)})`);};
  await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
  await command('Page.setInterceptFileChooserDialog',{enabled:true});
  await command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:output});
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
  await command('Fetch.enable',{patterns:[{urlPattern:`${apiRoot}/api/*`}]});
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await command('Page.navigate',{url:ui});await until(`!!document.querySelector('input[type="email"]')`);
  await mkdir('/tmp/nexora-admin-shots',{recursive:true});
  await until(`[...document.images].some(x=>x.alt==='تصویر لپ‌تاپ'&&x.complete&&x.naturalWidth>0)`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('input[type="email"]')).textAlign`),'right');
  assert.ok(await evaluate(`document.querySelector('input[type="email"]').getBoundingClientRect().x<document.querySelector('.login-story').getBoundingClientRect().x`));
  await writeFile('/tmp/nexora-admin-shots/login-light.png',Buffer.from((await command('Page.captureScreenshot')).data,'base64'));
  await click('بررسی اتصال');await until(`document.body.innerText.includes('بک‌اند پاسخ می‌دهد')`);
  await click('فعال کردن حالت تیره');await until(`document.documentElement.classList.contains('dark')`);
  await writeFile('/tmp/nexora-admin-shots/login-dark.png',Buffer.from((await command('Page.captureScreenshot')).data,'base64'));
  await click('فعال کردن حالت روشن');await input('ایمیل',manager.email);await input('رمز عبور','wrong-password');await click('ورود به مرکز مدیریت');
  await until(`document.body.innerText.includes('ایمیل یا رمز عبور نادرست است.')`);
  await click('نمایش رمز');assert.equal(await evaluate(`document.querySelector('#admin-password').type`),'text');await click('پنهان کردن رمز');
  await input('رمز عبور','test-password-12345');await click('ورود به مرکز مدیریت');await until(`document.body.innerText.includes('داشبورد مدیریت نکسورا')`);
  await until(`!!document.querySelector('[aria-label="اعلان‌های خبرنامه، 2 خوانده‌نشده"]')`);
  await writeFile('/tmp/nexora-admin-shots/dashboard.png',Buffer.from((await command('Page.captureScreenshot')).data,'base64'));
  await click('بررسی درخواست‌ها');await until(`document.body.innerText.includes('مشتری آزمایشی')`);
  await click('بررسی و صدور فاکتور عمده');await input('قیمت واحد قلم 1','۲۵۰۰۰۰۰۰');await click('بازبینی فاکتور پیش از تأیید');
  await until(`document.body.innerText.includes('بازبینی نهایی فاکتور')`);assert.equal(approved,0);
  await click('تأیید نهایی و ارسال فاکتور در تلگرام');await until(`document.body.innerText.includes('کد رهگیری: 12345678')`);assert.equal(approved,1);
  assert.ok(await evaluate(`!!document.querySelector('a[href$="/customer-requests/42/invoice"]')`));
  console.log('Checked wholesale preview, approval and tracking.');
  await navigate('products','توضیح محصول در سایت');await click('غیرفعال کردن');await until(`[...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='فعال کردن')`);assert.equal(product.isActive,false);
  await evaluate(`document.querySelector('[title="ویرایش محصول"]').click()`);await until(`!!document.querySelector('[role="dialog"]')`);
  await input('توضیحات','توضیح ویرایش‌شده');
  await evaluate(`document.querySelector('[role="dialog"] form').requestSubmit()`);await until(`!document.querySelector('[role="dialog"]')`);assert.equal(product.description,'توضیح ویرایش‌شده');
  await evaluate(`document.querySelector('[aria-label="فیلتر دسته‌بندی محصولات"]').click()`);await until(`!!document.querySelector('[role="option"]')`);
  await evaluate(`[...document.querySelectorAll('[role="option"]')].find(x=>x.textContent.includes('گوشی هوشمند')).click()`);
  await until(`!!document.querySelector('[aria-label="نوع محصول؛ مثلاً هندزفری"]')`);
  await click('ورود از اکسل');await until(`!!document.querySelector('input[type="file"]')`);
  const picker=await command('DOM.getDocument');const fileNode=await command('DOM.querySelector',{nodeId:picker.root.nodeId,selector:'input[type="file"]'});
  await command('DOM.setFileInputFiles',{nodeId:fileNode.nodeId,files:[spreadsheetFixture]});await click('بررسی و پیش‌نمایش');await until(`document.body.innerText.includes('محصول اکسل آزمایشی')`);
  assert.equal(imports,1);await click('ثبت نهایی ۱ محصول');await until(`document.body.innerText.includes('۱ محصول ثبت شد.')`);assert.equal(imports,2);await click('بستن');await until(`!document.querySelector('[role="dialog"]')`);
  await navigate('pricing','تغییر گروهی قیمت محصولات');await click('پیش‌نمایش قیمت‌ها');await until(`!!document.querySelector('input[type="checkbox"]')`);assert.equal(priceWrites,0);
  await evaluate(`document.querySelector('input[type="checkbox"]').click()`);await click('اعمال افزایش برای ۱ محصول');await until(`document.body.innerText.includes('نتیجهٔ تغییر قیمت')`);assert.equal(priceWrites,1);
  console.log('Checked product editing, import and bulk pricing.');
  await navigate('logs','رویدادهای مدیریت');await until(`document.body.innerText.includes('تأیید عمده و صدور فاکتور')`);
  await input('از تاریخ','2026-11-01');await input('تا تاریخ','2026-11-09');await click('اعمال بازهٔ تاریخ UTC');
  await click('دانلود اکسل گزارش‌ها');await until(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='دانلود اکسل گزارش‌ها')?.disabled===false`);await click('دانلود ورد گزارش‌ها');
  await wait(400);assert.deepEqual(exports,['xlsx','docx']);
  await navigate('messages','آخرین عضویت‌ها');await until(`document.body.innerText.includes('newsletter@example.test')`);
  await until(`!!document.querySelector('[aria-label="اعلان‌های خبرنامه، 0 خوانده‌نشده"]')`);assert.equal(unread,0);
  await navigate('orders','خریدار سایت');await until(`document.body.innerText.includes('تلگرام · خرید عمده')`);
  await writeFile('/tmp/nexora-admin-shots/orders-mixed.png',Buffer.from((await command('Page.captureScreenshot')).data,'base64'));
  assert.equal(await evaluate(`document.querySelectorAll('a[href$="/customer-requests/42/invoice"]').length`),0);
  await evaluate(`[...document.querySelectorAll('section')].find(x=>x.textContent.includes('خریدار سایت')&&x.querySelector('button')?.textContent.trim()==='جزئیات و فاکتور').querySelector('button').click()`);
  await until(`document.body.innerText.includes('نشانی کامل سفارش سایت')`);
  assert.ok(await evaluate(`!!document.querySelector('a[href$="/orders/7/invoice.pdf"]')`));await click('بستن');
  await click('منبع سفارش');await until(`!!document.querySelector('[role="option"]')`);await evaluate(`[...document.querySelectorAll('[role="option"]')].find(x=>x.textContent.includes('تلگرام · عمده')).click()`);
  await until(`!document.body.innerText.includes('خریدار سایت')`);
  for(const width of [320,390,1024,1440]){await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await wait(150);assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),`Order register fits ${width}px`);}
  await click('جزئیات و فاکتور');
  await until(`document.body.innerText.includes('فاکتور عمدهٔ تلگرام 42')`);
  await writeFile('/tmp/nexora-admin-shots/telegram-invoice-detail.png',Buffer.from((await command('Page.captureScreenshot')).data,'base64'));
  assert.ok(await evaluate(`!!document.querySelector('[role="dialog"] a[href$="/customer-requests/42/invoice"]')`));
  assert.ok(await evaluate(`!document.querySelector('[role="dialog"]').textContent.includes('ثبت پرداخت بررسی‌شده')`));
  await click('بستن');
  await navigate('content','محتوای صفحه اصلی');await until(`document.body.innerText.includes('ذخیره تغییرات')`);
  await input('عنوان','عنوان تازه');await click('ذخیره تغییرات');await until(`document.body.innerText.includes('تغییرات ذخیره شد')`);assert.equal(contentWrites,1);
  await navigate('articles','مجله فناوری');await click('مقاله جدید');await until(`document.body.innerText.includes('مقاله جدید')`);
  await navigate('assistant','آزمایش با محصولات واقعی');await click('ذخیره تنظیمات');await wait(200);assert.equal(assistantWrites,1);
  await click('آزمایش پاسخ');await until(`document.body.innerText.includes('پاسخ آزمایشی کاتالوگ')`);
  for(const width of [320,390,768,1024,1440]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await wait(120);
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),`No overflow at ${width}`);
  }
  await navigate('account','حساب مدیریت');await click('حالت نمایش حساب');await until(`!!document.querySelector('[role="option"]')`);await evaluate(`[...document.querySelectorAll('[role="option"]')].find(x=>x.textContent.trim()==='تیره').click()`);
  await until(`document.documentElement.classList.contains('dark')`);
  await command('Page.reload');await until(`document.body?.innerText.includes('حساب مدیریت')&&document.documentElement.classList.contains('dark')`);
  await click('خروج از حساب');await until(`document.body.innerText.includes('ورود مدیران')`);
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});
  await writeFile('/tmp/nexora-admin-shots/login-mobile.png',Buffer.from((await command('Page.captureScreenshot')).data,'base64'));
  assert.equal(logins,2);assert.ok(productWrites>=2);assert.deepEqual(errors,[]);
  console.log('PASS: unified admin login/themes, dashboard poster, wholesale preview and approval, product edit/toggle/type filters, XLSX import, bulk snapshot, XLSX/DOCX audit downloads, newsletter read cursor, site order PDF/detail, content/articles/assistant and responsive layout. API fixtures only.');
} finally {
 socket?.close();chrome.kill();if(chrome.exitCode===null)await new Promise(resolve=>chrome.once('exit',resolve));
 await rm(output,{recursive:true,force:true,maxRetries:10,retryDelay:100});
}
