// Dependency-free smoke check. Start isolated API/UI servers first; override
// NEXORA_API_URL, NEXORA_UI_URL or NEXORA_CHROME when using other ports/platforms.
import assert from 'node:assert/strict';
import https from 'node:https';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const apiUrl = process.env.NEXORA_API_URL || 'http://127.0.0.1:8000';
const uiUrl = process.env.NEXORA_UI_URL || 'http://127.0.0.1:3001';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(apiUrl).hostname), 'Use a local test API, never production');
const cookies = new Map();
function api(path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = data === undefined ? undefined : JSON.stringify(data);
    const transport = new URL(apiUrl).protocol === 'https:' ? https : http;
    const req = transport.request(new URL(path, apiUrl), {
      // Only this local development test accepts the self-signed certificate.
      rejectUnauthorized: false, method: body ? 'POST' : 'GET',
      headers: { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    }, response => {
      for (const cookie of response.headers['set-cookie'] || []) {
        const pair = cookie.split(';')[0], index = pair.indexOf('=');
        cookies.set(pair.slice(0, index), pair.slice(index + 1));
      }
      let text = ''; response.on('data', chunk => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, data: text ? JSON.parse(text) : null }));
    });
    req.on('error', reject); req.end(body);
  });
}
async function post(path, data = {}) {
  const { data: csrf } = await api('/api/csrf');
  return api(`/api/auth/${path}`, data, { 'X-CSRF-TOKEN': csrf.token });
}
if (!process.env.NEXORA_SKIP_API) {
const account = { email: `smoke-${Date.now()}@example.com`, password: 'Nexora-test-98765', fullName: 'کاربر آزمایشی' };
assert.equal((await api('/api/auth/register', account)).status, 400);
assert.equal((await post('register', account)).status, 202);
assert.equal((await post('login', account)).status, 200);
assert.equal((await api('/api/auth/me')).data.fullName, account.fullName);
assert.equal((await post('register', account)).status, 202);
assert.equal((await post('logout')).status, 204);
assert.equal((await api('/api/auth/me')).status, 401);
assert.equal((await post('login', { ...account, password: 'wrong-password' })).status, 401);
assert.equal((await post('login', account)).status, 200);
assert.equal((await post('logout')).status, 204);
const providers = await api('/api/auth/providers');
assert.equal((await post('google', { credential: 'forged-token' })).status, providers.data.googleClientId ? 401 : 503);
assert.equal((await api('/api/auth/me')).status, 401);
console.log('PASS: register, persisted name, duplicate email, logout, password login, CSRF, invalid Google token');
}

const output = await mkdtemp(join(tmpdir(), 'nexora-auth-check-'));
const chrome = spawn(process.env.NEXORA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${output}`, '--no-first-run', '--no-default-browser-check', 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = (await readFile(join(output, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await delay(100); }
  }
  assert.ok(port, 'Chrome started');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map(), errors = [];
  let authenticated = false;
  let productsFailure = null;
  let productRequests = 0;
  let accountFixtures = false;
  let ordersFailure = false;
  let profileName = 'کاربر آزمایشی';
  const products = JSON.parse(await readFile(new URL('../backend/data/products.json', import.meta.url), 'utf8'));
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const call = ++id;
      const timeout = setTimeout(() => { pending.delete(call); reject(new Error(`Timeout: ${method}`)); }, 15000);
      pending.set(call, message => { clearTimeout(timeout); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); });
      socket.send(JSON.stringify({ id: call, method, params }));
    });
  }
  function interceptionFailure(error) {
    // Navigation and React cleanup can cancel an intercepted request before
    // Chrome receives its mock response. This is not a page runtime exception.
    if (error.message === '{"code":-32602,"message":"Invalid InterceptionId."}') return;
    errors.push(error.message);
  }
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const path = new URL(message.params.request.url).pathname;
      if (path === '/api/products') {
        productRequests++;
        if (productsFailure) {
          const failure = productsFailure === 'network'
            ? command('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'ConnectionFailed' })
            : command('Fetch.fulfillRequest', {
              requestId: message.params.requestId,
              responseCode: productsFailure === 'invalid' ? 200 : productsFailure,
              responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
              body: Buffer.from(JSON.stringify({ error: 'درخواست انجام نشد. دوباره تلاش کنید.' })).toString('base64'),
            });
          failure.catch(interceptionFailure);
          return;
        }
      }
      if (path === '/api/auth/logout') authenticated = false;
      if (path === '/api/account/profile') profileName = JSON.parse(message.params.request.postData).fullName;
      const fixtureOrder = { id: 42, total: products[0].price, status: 'pending_payment', createdAt: '2026-10-01T10:00:00Z' };
      const data = path === '/api/auth/forgot-password' ? { message: 'اگر این ایمیل حسابی با رمز عبور داشته باشد، لینک بازیابی ارسال می‌شود.' } : path === '/api/products' ? products : path === '/api/csrf' ? { token: 'test-csrf' } : path === '/api/auth/providers' ? { googleClientId: null } : ['/api/auth/me', '/api/account/profile'].includes(path) ? { email: 'test@example.com', fullName: profileName }
        : accountFixtures && path === '/api/account/orders' ? [fixtureOrder]
        : accountFixtures && path === '/api/account/orders/42' ? { ...fixtureOrder, shipping: 0, lines: [{ productId: products[0].id, name: products[0].name, quantity: 1, unitPrice: products[0].price }] }
        : accountFixtures && path === '/api/account/cart' ? [{ product: products[0], quantity: 2 }]
        : accountFixtures && path === '/api/account/wishlist' ? products.slice(0, 2) : [];
      command('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: path === '/api/auth/logout' ? 204 : path === '/api/auth/me' && !authenticated ? 401 : ordersFailure && path === '/api/account/orders' ? 503 : 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(data)).toString('base64') }).catch(interceptionFailure);
    }
  };
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function until(expression) {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await delay(100); }
    console.log(await evaluate('({url: location.href, body: document.body.innerText.slice(0, 1500)})'), errors);
    throw new Error(`Condition not met: ${expression}`);
  }
  async function click(text) {
    await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') === ${JSON.stringify(text)} || b.textContent.trim() === ${JSON.stringify(text)}) && b.getBoundingClientRect().width > 0); if (!b) throw new Error('Button missing'); b.click(); })()`);
    await delay(150);
  }
  const resize = width => command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  const screenshot = async name => { const { data } = await command('Page.captureScreenshot'); await writeFile(join(output, name + '.png'), Buffer.from(data, 'base64')); };
  await command('Runtime.enable');
  // External fonts/images are unrelated to these local UI checks and can hang
  // parsing when the test machine has no access to their CDNs.
  await command('Network.enable');
  await command('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*', 'https://images.unsplash.com/*'] });
  await command('Fetch.enable', { patterns: [{ urlPattern: `${uiUrl}/api/*` }] });
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await resize(1440);
  for (const failure of [404, 503, 'network', 'invalid']) {
    productsFailure = failure;
    await command('Page.navigate', { url: uiUrl });
    await until('document.querySelector("#trending [role=status]")?.textContent.includes("امکان دریافت محصولات نیست")');
    assert.ok(await evaluate('![...document.querySelectorAll("h4")].some(h => h.textContent.trim() === "خطا")'), 'Page load does not open the global error toast');
    const beforeRetry = productRequests;
    await delay(250);
    assert.equal(productRequests, beforeRetry, 'No automatic retry loop');
    productsFailure = null;
    await click('تلاش مجدد برای دریافت محصولات');
    await until('!!document.querySelector("#trending img") && !document.querySelector("#trending [role=status]")');
    assert.equal(productRequests, beforeRetry + 1, 'One click issues one retry');
  }
  console.log('PASS: startup 404/503/network/invalid responses stay inline, no blocking toast, retry restores catalogue');
  await command('Page.navigate', { url: uiUrl });
  await until('!!document.querySelector("header")');
  await evaluate('document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, 650)');
  await delay(200);
  assert.ok(await evaluate('Math.abs(document.querySelector("header").getBoundingClientRect().y - 16) < 2'));
  await evaluate('window.scrollTo(0, document.querySelector("footer").offsetTop - innerHeight + 80)');
  await until('!document.querySelector("header")');
  await evaluate('window.scrollTo(0, 0)');
  await until('!!document.querySelector("header")');
  console.log('PASS: desktop follows scroll, hides at footer, returns above footer');
  for (const width of [320, 390, 768, 1440]) {
    await resize(width);
    await click('ورود به حساب کاربری');
    await until('!!document.querySelector("dialog[open]")');
    assert.ok(await evaluate('(() => { const r = document.querySelector("dialog").getBoundingClientRect(); return r.x >= -1 && r.right <= innerWidth + 1; })()'));
    if (width < 640) assert.ok(await evaluate('Math.abs(document.querySelector("dialog").getBoundingClientRect().bottom - innerHeight) < 2'));
    await screenshot(`welcome-${width}`);
    await click('ساخت حساب کاربری');
    assert.ok(await evaluate('!!document.querySelector("input[autocomplete=name]")'));
    await click('نمایش رمز عبور');
    assert.ok(await evaluate('!document.querySelector("input[type=password]")'));
    assert.ok(await evaluate('document.querySelector("dialog").scrollWidth <= document.querySelector("dialog").clientWidth + 1'));
    await screenshot(`register-${width}`);
    await click('وارد شو');
    assert.ok(await evaluate('!document.querySelector("input[autocomplete=name]")'));
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await until('!document.querySelector("dialog")');
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  }
  await resize(390);
  await evaluate('document.documentElement.classList.add("dark")');
  await click('ورود به حساب کاربری');
  await click('ساخت حساب کاربری');
  await screenshot('register-dark');
  await click('بستن پنجره ورود');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 620, deviceScaleFactor: 1, mobile: false });
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await evaluate('document.documentElement.classList.remove("dark")');
  await click('ورود به حساب کاربری');
  assert.equal(await evaluate('getComputedStyle(document.querySelector("dialog")).animationName'), 'auth-sheet-enter');
  assert.ok(await evaluate('document.querySelector("dialog").getBoundingClientRect().bottom >= innerHeight - 1'), 'Sheet enters from below, never from above');
  await delay(450);
  await until('[...document.querySelectorAll(".auth-gadget")].every(img => img.complete && img.naturalWidth > 0)');
  await screenshot('gadgets-mobile');
  await click('ساخت حساب کاربری');
  assert.ok(await evaluate('(() => { const s = document.querySelector(".auth-scroll"); return s.scrollHeight > s.clientHeight && getComputedStyle(document.querySelector("dialog")).overflowY === "hidden"; })()'), 'Only inner content scrolls');
  await evaluate('document.querySelector(".auth-scroll").scrollTop = 10000');
  assert.ok(await evaluate('document.querySelector(".auth-scroll").scrollTop > 0'));
  await screenshot('register-scrolled-mobile');
  await click('بستن پنجره ورود');
  await click('ورود به حساب کاربری');
  await delay(450);
  assert.ok(await evaluate('document.querySelector(".auth-scroll").scrollTop === 0 && Math.abs(document.querySelector("dialog").getBoundingClientRect().bottom - innerHeight) < 1'), 'Reopening resets scroll without jumping');
  await click('بستن پنجره ورود');
  for (const loggedIn of [false, true]) {
    authenticated = loggedIn;
    await command('Page.navigate', { url: uiUrl });
    const label = loggedIn ? 'حساب کاربری' : 'ورود به حساب کاربری';
    await until(`!!document.querySelector('.mobile-header-actions button[aria-label="${label}"]')`);
    for (const dark of [false, true]) {
      await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`);
      assert.ok(await evaluate(`(() => { const svg = document.querySelector('.mobile-header-actions button[aria-label="${label}"] svg'); return svg.getBoundingClientRect().width > 0 && svg.getAttribute('stroke') === 'currentColor' && getComputedStyle(svg).color !== 'rgb(255, 255, 255)'; })()`));
    }
  }
  console.log('PASS: contained scroll, gentle sheet entry/reopen, gadget assets, login/logout icon visibility in both themes');
  await click('حساب کاربری');
  await until('location.pathname === "/account" && !!document.querySelector(".account-page")');
  accountFixtures = true; authenticated = true;
  await resize(1440);
  await command('Page.navigate', { url: `${uiUrl}/account` });
  await until('!!document.querySelector(".account-order")');
  assert.ok(await evaluate('!!document.querySelector(\'meta[name="robots"][content*="noindex"]\')'));
  assert.ok(await evaluate('!performance.getEntriesByType("resource").some(r => /HomePage-|AuthModal-|auth-headphones/.test(r.name))'), 'Account does not load home or login chunks');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await resize(width);
    for (const dark of [false, true]) {
      await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`);
      await delay(100);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `No horizontal overflow: ${width}, dark=${dark}`);
    }
  }
  await screenshot('account-desktop-dark');
  await resize(390); await evaluate('document.documentElement.classList.remove("dark")');
  await delay(400);
  await screenshot('account-mobile');
  await click('سفارش‌های من'); await click('جزئیات سفارش');
  await until('!!document.querySelector(".account-order-line")');
  await click('اطلاعات شخصی');
  await evaluate(`(() => { const input = document.querySelector('.account-form input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Updated Account'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click('ذخیرهٔ تغییرات');
  await until('document.querySelector(".account-success")?.textContent.includes("ذخیره شد")');
  assert.equal(profileName, 'Updated Account');
  await evaluate(`document.querySelectorAll('.account-password-panel input').forEach(input => { const value = input.name === 'currentPassword' ? 'old-password-12345' : 'changed-password-12345'; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); })`);
  await click('تغییر رمز عبور');
  await until('!!document.querySelector(".account-password-panel .account-success")');
  assert.ok(await evaluate('[...document.querySelectorAll(".account-password-panel input")].every(input => input.value === "")'));
  await click('علاقه‌مندی‌ها');
  assert.equal(await evaluate('document.querySelectorAll(".account-product").length'), 2);
  await click('سبد خرید');
  assert.equal(await evaluate('document.querySelectorAll(".account-product").length'), 1);
  for (const width of [390, 1024, 1440]) {
    await resize(width);
    assert.ok(await evaluate(`(() => { const card = document.querySelector('.account-product'), frame = card.querySelector('.account-product-image'), img = frame.querySelector('img'); const c = card.getBoundingClientRect(), f = frame.getBoundingClientRect(), i = img.getBoundingClientRect(); return f.left >= c.left && f.right <= c.right && i.height <= f.height && i.width <= f.width && getComputedStyle(img).objectFit === (card.classList.contains('user-cart-card') && innerWidth < 1024 ? 'cover' : 'contain') && document.documentElement.scrollWidth <= innerWidth; })()`));
  }
  await evaluate('document.querySelector(".account-products").scrollIntoView({block:"center",behavior:"instant"})');
  await delay(400);
  await screenshot('cart-account-desktop');
  await resize(390);
  await click('امنیت حساب'); await click('خروج از حساب کاربری');
  await until('location.pathname === "/"');
  assert.ok(await evaluate('!document.querySelector(\'meta[name="robots"][content*="noindex"]\')'));
  await command('Page.navigate', { url: `${uiUrl}/account` });
  await until('!!document.querySelector(".account-gate")');
  assert.ok(await evaluate('!document.body.innerText.includes("test@example.com")'));
  authenticated = true; ordersFailure = true;
  await command('Page.navigate', { url: `${uiUrl}/account` });
  await until('!!document.querySelector(".account-notice")');
  ordersFailure = false; await click('تلاش مجدد');
  await until('!!document.querySelector(".account-order")');
  await evaluate('window.dispatchEvent(new Event("nexora:session-expired"))');
  await until('!!document.querySelector(".account-gate")');
  console.log('PASS: responsive account, split loading, profile edit, private orders, cart/wishlist, logout, retry and session expiry');
  await click('ورود یا ساخت حساب');
  await until('!!document.querySelector("dialog[open]")');
  await evaluate('document.querySelector("dialog .auth-secondary").click()');
  await until('!!document.querySelector(".recovery-link")');
  await click('رمز عبورت رو فراموش کردی؟');
  await until('!!document.querySelector(".auth-recovery-content")');
  await evaluate(`(() => { const input = document.querySelector('.auth-recovery-content input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'test@example.com'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click('ارسال لینک بازیابی');
  await until('!!document.querySelector(".recovery-success")');
  await screenshot('recovery-email-mobile');
  await click('بستن پنجره ورود');
  await command('Page.navigate', { url: `${uiUrl}/reset-password#token=${'a'.repeat(43)}` });
  await until('document.querySelectorAll(".reset-page input").length === 2');
  assert.equal(await evaluate('location.hash'), '');
  for (const width of [320, 390, 768, 1440]) {
    await resize(width);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  }
  await resize(390);
  await evaluate(`document.querySelectorAll('.reset-page input').forEach(input => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'fresh-password-12345'); input.dispatchEvent(new Event('input', { bubbles: true })); })`);
  await screenshot('recovery-password-mobile');
  await click('ذخیرهٔ رمز جدید');
  await until('!!document.querySelector(".recovery-success")');
  console.log('PASS: password recovery forms, fragment removal, responsive reset page and successful reset');
  assert.deepEqual(errors, []);
  console.log(`PASS: RTL forms, 320/390/768/1440px, bottom sheet, password toggle, Escape. Screenshots: ${output}`);
} finally { socket?.close(); chrome.kill(); }
