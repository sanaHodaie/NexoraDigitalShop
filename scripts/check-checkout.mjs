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
  await command('Page.navigate', { url:base+'/checkout' });
  await until(`document.readyState==='complete'`);
  await evaluate(`(async()=>{
    const {api,resetCsrf}=await import('/src/api/client.js');
    await api('/auth/login',{method:'POST',body:JSON.stringify({email:'browser-user@example.test',password:'browser-test-password-123'})});
    resetCsrf();
    await api('/account/cart/phone-01',{method:'PUT',body:JSON.stringify({quantity:2})});
  })()`);
  await command('Page.navigate', { url:base+'/checkout' });
  await until(`Boolean(document.querySelector('input[name="recipient"]'))`);
  await evaluate(`(() => {
    const values={recipient:'کاربر تست فاکتور',phone:'۰۹۱۲۳۴۵۶۷۸۹',province:'تهران',city:'تهران',postalCode:'۱۲۳۴۵۶۷۸۹۰',building:'۱۲',unit:'۲',address:'خیابان آزمایش، کوچهٔ نمونه، ساختمان نکسورا'};
    for (const [name,value] of Object.entries(values)) {
      const input=document.querySelector('[name="'+name+'"]');
      const proto=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(input,value);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  })()`);
  for (const width of [320,375,768,1440]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Checkout overflow ${width}`);
  }
  await evaluate(`document.querySelector('.checkout-form').requestSubmit()`);
  await until(`Boolean(document.querySelector('.invoice-badge.draft'))`);
  const oid=await evaluate(`new URLSearchParams(location.search).get('invoice')`);
  assert.ok(/^\d+$/.test(oid));
  for (const width of [320,375,768,1440]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Invoice overflow ${width}`);
    const shot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
    await writeFile(join(output,`invoice-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  assert.ok(await evaluate(`document.querySelector('.invoice-recipient').innerText.includes('کاربر تست فاکتور')`));
  await evaluate(`document.documentElement.classList.add('dark')`);
  await writeFile(join(output,'invoice-dark.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await evaluate(`document.documentElement.classList.remove('dark')`);
  await evaluate(`document.querySelector('.checkout-actions .checkout-primary').click()`);
  await until(`Boolean(document.querySelector('.invoice-badge.pending_payment'))`);
  assert.equal(await evaluate(`new URLSearchParams(location.search).get('invoice')`),oid);
  const downloaded=await evaluate(`(async()=>{const r=await fetch('/api/account/orders/${oid}/invoice');return {status:r.status,text:await r.text(),type:r.headers.get('content-disposition')};})()`);
  assert.equal(downloaded.status,200);assert.ok(downloaded.type.includes('attachment'));
  assert.ok(downloaded.text.includes('کاربر تست فاکتور'));
  await evaluate(`(async()=>{const {api}=await import('/src/api/client.js');await api('/auth/logout',{method:'POST'});})()`);
  await command('Page.navigate',{url:base+'/admin'});
  await until(`Boolean(document.querySelector('input[type="email"]'))`);
  await evaluate(`(() => {
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    for(const [selector,value] of [['input[type="email"]','browser-admin@example.test'],['input[type="password"]','browser-test-password-123']]){const el=document.querySelector(selector);set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));}
    document.querySelector('form').requestSubmit();
  })()`);
  await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText.includes('سفارشات'))`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText.includes('سفارشات')).click()`);
  await until(`Array.from(document.querySelectorAll('button')).some(b=>b.innerText==='جزئیات و فاکتور')`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.innerText==='جزئیات و فاکتور').click()`);
  await until(`Boolean(document.querySelector('.invoice-recipient'))`);
  assert.ok(await evaluate(`document.querySelector('.invoice-recipient').innerText.includes('کاربر تست فاکتور')`));
  assert.equal(await evaluate(`Boolean(document.querySelector('a[href*="/warranty"]'))`),false);
  await evaluate(`(async()=>{const {api}=await import('/src/api/client.js');await api('/admin/orders/${oid}/confirm-payment',{method:'POST',body:JSON.stringify({reference:'browser-verified-payment-${oid}'})});})()`);
  await evaluate(`document.querySelector('[aria-label="به‌روزرسانی فاکتور"]').click()`);
  await until(`Boolean(document.querySelector('.invoice-badge.paid'))`);
  assert.ok(await evaluate(`Boolean(document.querySelector('a[href*="/warranty"]'))`));
  for(const width of [320,375,768,1440]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Admin invoice overflow ${width}`);
    await writeFile(join(output,`admin-invoice-${width}.png`),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  }
  await command('Page.navigate',{url:base+`/api/admin/orders/${oid}/invoice?download=false`});
  await until(`Boolean(document.querySelector('.totals'))`);
  await command('Emulation.setEmulatedMedia',{media:'print'});
  await writeFile(join(output,'invoice-print.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  const invoicePdf=await command('Page.printToPDF',{printBackground:false,preferCSSPageSize:true});
  await writeFile(join(output,'invoice.pdf'),Buffer.from(invoicePdf.data,'base64'));
  await command('Emulation.setEmulatedMedia',{media:''});
  await command('Page.navigate',{url:base+`/api/admin/orders/${oid}/warranty?download=false`});
  await until(`Boolean(document.querySelector('.warranty'))`);
  assert.equal(await evaluate(`document.querySelectorAll('.warranty').length`),2);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('main')).maxWidth`),'980px');
  assert.equal(await evaluate(`document.querySelectorAll('script').length`),0);
  const pdf=await command('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
  await writeFile(join(output,'warranty.pdf'),Buffer.from(pdf.data,'base64'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,orderId:oid,screenshots:output,checks:['address validation','draft','submit','customer/admin parity','payment status','warranty','PDF','320/375/768/1440 no overflow']}));
} finally {
  socket?.close();
  browser.kill();
}
