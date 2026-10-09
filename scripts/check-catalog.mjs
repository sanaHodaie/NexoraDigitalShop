// Local browser smoke checks against a running Vite server and seeded API.
// Only GET requests are made to the real API; no user records are changed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const base = process.env.NEXORA_UI_URL || 'http://127.0.0.1:3002';
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
  await command('Network.enable');
  await command('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*', 'https://images.unsplash.com/*'] });
  await command('Page.navigate', { url: `${base}/category/smartphones` });
  await until('document.querySelectorAll(".catalog-card").length === 10');
  await evaluate('window.__catalogNavigationCheck = 1');
  for (const width of [320, 375, 480, 768, 1024, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const dark of [false, true]) {
      await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`);
      await wait(100);
      const metrics = await evaluate(`({width: innerWidth, scroll: document.documentElement.scrollWidth, overflowing: [...document.querySelectorAll('.catalog-page *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && !el.closest('.catalog-hero-art'); }).map(el => el.className)})`);
      assert.ok(metrics.scroll <= width && !metrics.overflowing.length, `Overflow at ${width}: ${JSON.stringify(metrics)}`);
    }
  }
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.documentElement.classList.remove('dark')");
  await wait(400);
  const desktop = await command('Page.captureScreenshot');
  await writeFile(join(output, 'desktop.png'), Buffer.from(desktop.data, 'base64'));
  await evaluate("document.querySelector('.catalog-breadcrumb a').click()");
  await until('location.pathname === "/" && Boolean(document.querySelector("#trending"))');
  await evaluate("document.querySelector('a[href=\"/category/laptops\"]').click()");
  await until('location.pathname === "/category/laptops" && document.querySelectorAll(".catalog-card").length === 10');
  assert.equal(await evaluate('window.__catalogNavigationCheck'), 1, 'SPA navigation avoids page reload');
  await evaluate('history.back()');
  await until('location.pathname === "/" && Boolean(document.querySelector("#trending"))');
  await evaluate('history.back()');
  await until('location.pathname === "/category/smartphones" && document.querySelectorAll(".catalog-card").length === 10');
  await evaluate("[...document.querySelectorAll('.catalog-brands button')].find(b => b.textContent === 'Apple').click()");
  await until('document.querySelectorAll(".catalog-card").length === 5');
  await command('Page.reload');
  await until('!window.__catalogNavigationCheck && document.querySelectorAll(".catalog-card").length === 5 && Boolean(document.querySelector(".catalog-results-line button"))');
  await evaluate("document.querySelector('.catalog-results-line button').click()");
  await until('document.querySelectorAll(".catalog-card").length === 10');
  await evaluate("document.querySelector('.catalog-detail').click()");
  await until('document.querySelectorAll(".fixed.inset-0.z-50").length > 0');
  await command('Page.navigate', { url: `${base}/category/laptops` });
  await until('document.querySelectorAll(".catalog-card").length === 10');
  for (const width of [320, 375, 480, 768, 1024, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const dark of [false, true]) {
      await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`);
      await wait(100);
      assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.catalog-card')].every(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })`), `Laptop overflow at ${width}`);
    }
  }
  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.documentElement.classList.add('dark')");
  await wait(400);
  const mobile = await command('Page.captureScreenshot');
  await writeFile(join(output, 'mobile-dark.png'), Buffer.from(mobile.data, 'base64'));
  await evaluate("document.querySelector('.catalog-breadcrumb a').click()");
  await until('location.pathname === "/" && Boolean(document.querySelector("#trending"))');
  await evaluate("document.querySelector('a[href=\"/category/smartphones\"]').click()");
  await until('location.pathname === "/category/smartphones" && document.querySelectorAll(".catalog-card").length === 10');
  assert.deepEqual(errors, []);
  await evaluate("document.querySelector('.catalog-breadcrumb a').click()");
  await until('location.pathname === "/" && Boolean(document.querySelector("#trending"))');
  await evaluate("document.querySelector('a[href=\"/category/audio\"]').click()");
  await until('location.pathname === "/category/audio" && document.querySelectorAll(".catalog-card").length === 10');
  assert.equal(await evaluate('document.querySelectorAll(".catalog-switch a").length'), 1);
  assert.equal(await evaluate('document.querySelector(".catalog-switch a").getAttribute("href")'), '/category/audio');
  for (const width of [320, 375, 480, 768, 1024, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const dark of [false, true]) {
      await evaluate(`document.documentElement.classList.toggle('dark', ${dark})`);
      await wait(100);
      assert.ok(await evaluate(`document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.catalog-page *')].every(el => { const r = el.getBoundingClientRect(); return !r.width || el.closest('.catalog-hero-art') || (r.left >= -1 && r.right <= innerWidth + 1); })`), `Audio overflow at ${width}`);
    }
  }
  await evaluate("document.documentElement.classList.remove('dark')");
  await wait(400);
  const audioDesktop = await command('Page.captureScreenshot');
  await writeFile(join(output, 'audio-desktop.png'), Buffer.from(audioDesktop.data, 'base64'));
  await evaluate("[...document.querySelectorAll('.catalog-brands button')].find(b => b.textContent === 'Sony').click()");
  await until('document.querySelectorAll(".catalog-card").length === 2');
  await evaluate("document.querySelector('.catalog-detail').click()");
  await until('document.querySelectorAll(".fixed.inset-0.z-50").length > 0');
  await command('Page.navigate', { url: `${base}/category/audio` });
  await until('location.search === "" && document.querySelectorAll(".catalog-card").length === 10');
  assert.deepEqual(errors, []);
  console.log(`PASS: 10 products/category, 6 widths, light/dark, router/back/reload, brand filter and quick view. Screenshots: ${output}`);
} finally { socket?.close(); browser.kill(); }
