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
  await command('Page.navigate',{url:base+'/account'});
  await until(`document.readyState==='complete'`);
  await evaluate(`(async()=>{
    const {api,resetCsrf}=await import('/src/api/client.js');
    await api('/auth/login',{method:'POST',body:JSON.stringify({email:'browser-admin@example.test',password:'browser-test-password-123'})});resetCsrf();
    await api('/account/cart/phone-01',{method:'PUT',body:JSON.stringify({quantity:2})});
  })()`);
  await command('Page.reload');
  await until(`Boolean(document.querySelector('.account-page button[aria-label="سبد خرید"]'))`);
  await evaluate(`document.querySelector('.account-page button[aria-label="سبد خرید"]').click()`);
  await until(`Boolean(document.querySelector('.user-cart-price'))`);
  const oldPrice=await evaluate(`document.querySelector('.user-cart-price').textContent`);
  const raisePrice = async () => evaluate(`(async()=>{
    const {api}=await import('/src/api/client.js');
    const body={category:'smartphones',brand:'Apple',percent:'15'};
    const preview=await api('/admin/products/pricing',{method:'POST',body:JSON.stringify(body)});
    return api('/admin/products/pricing',{method:'POST',body:JSON.stringify({...body,snapshot:preview.snapshot})});
  })()`);
  await raisePrice();
  // The customer stays on the same page; polling must replace the old price.
  await wait(16000);
  await until(`Boolean(document.querySelector('.user-cart-price')) && document.querySelector('.user-cart-price').textContent!==${JSON.stringify(oldPrice)}`);
  const newPrice=await evaluate(`document.querySelector('.user-cart-price').textContent`);
  await evaluate(`Array.from(document.querySelectorAll('.account-page button')).find(b=>b.textContent.includes('مدیریت سبد')).click()`);
  await until(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('ادامهٔ خرید و ثبت آدرس'))`);
  assert.ok(await evaluate(`document.body.textContent.includes(${JSON.stringify(newPrice)})`));
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('ادامهٔ خرید و ثبت آدرس')).click()`);
  await until(`Boolean(document.querySelector('input[name="recipient"]'))`);
  await wait(500); // Let the route-entry cart revalidation finish before filling the form.
  await until(`document.querySelectorAll('.checkout-form [name]').length===9`);
  await evaluate(`(() => {
    const values={recipient:'کاربر آزمایش',phone:'09123456789',province:'تهران',city:'تهران',postalCode:'1234567890',building:'12',address:'خیابان آزمایشی، کوچه آزمایش'};
    for(const [name,value] of Object.entries(values)){
      const el=document.querySelector('[name="'+name+'"]');
      Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);
      el.dispatchEvent(new Event('input',{bubbles:true}));
    }
  })()`);
  await evaluate(`document.querySelector('.checkout-form').requestSubmit()`);
  await until(`Boolean(document.querySelector('.invoice-grand'))`);
  const quote=await evaluate(`document.querySelector('.invoice-grand').textContent`);
  await raisePrice();
  await evaluate(`document.querySelector('[aria-label="به‌روزرسانی فاکتور"]').click()`);
  await until(`Boolean(document.querySelector('.invoice-grand')) && document.querySelector('.invoice-grand').textContent!==${JSON.stringify(quote)}`);
  await evaluate(`Array.from(document.querySelectorAll('.checkout-actions button')).find(b=>b.textContent.includes('تأیید و ثبت')).click()`);
  await until(`Boolean(document.querySelector('.invoice-badge.pending_payment'))`);
  await command('Page.navigate',{url:base+'/admin#products'});
  await until(`Boolean(document.querySelector('[role="combobox"]'))`);
  const type = async text => evaluate(`(() => {
    const el=Array.from(document.querySelectorAll('input[role="combobox"]')).find(e=>e.getClientRects().length);
    el.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(text)});
    el.dispatchEvent(new Event('input',{bubbles:true}));
  })()`);
  await type('آیفون ۱۵');
  await until(`document.querySelectorAll('[role="option"]').length>0`);
  for(const width of [320,375,768,1440]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    await type('آیفون ۱۵');
    await until(`Array.from(document.querySelectorAll('[role="option"]')).some(el=>el.getClientRects().length)`);
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Search overflow ${width}`);
    await writeFile(join(output,`admin-search-${width}.png`),Buffer.from((await command('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await until(`document.querySelectorAll('article[data-category]').length===1`);
  await type('unlikely-product-zzzz');
  await until(`document.body.textContent.includes('محصولی پیدا نشد.')`);
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('input[role="combobox"]')).find(e=>e.getClientRects().length).getAttribute('aria-expanded')`),'false');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,screenshots:output,checks:['cart polling','drawer fresh prices','new invoice','draft repricing','submit latest revision','admin autocomplete','keyboard','empty search','mobile layouts']}));
} finally {
  socket?.close();browser.kill();
}
