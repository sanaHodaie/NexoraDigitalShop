// Local browser smoke checks against a running Vite server and seeded API.
// Only GET requests are made to the real API; no user records are changed.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ARTICLES, articleHref } from '../src/data/article-index.js';
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
  await command('Page.bringToFront');
  await command('Network.enable');
  await command('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*', 'https://images.unsplash.com/*'] });
  await command('Page.navigate', { url: base });
  await until(`document.querySelectorAll('#articles a[href^="/magazine/"]').length === 4`);
  await evaluate('window.__editorialNavigation = 1');
  await evaluate(`document.querySelector('a[href="/category/more"]').click()`);
  await until('document.querySelectorAll(".catalog-card").length === 10');
  assert.equal(await evaluate('window.__editorialNavigation'), 1);
  await evaluate('[...document.querySelectorAll(".catalog-card img")].forEach(img => img.loading="eager")');
  await until('[...document.querySelectorAll(".catalog-card img")].every(i=>i.complete&&i.naturalWidth>0)');
  await evaluate('document.querySelector(".catalog-detail").click()');
  await until('document.querySelectorAll(".fixed.inset-0.z-50").length > 0');
  await command('Page.navigate', { url: `${base}/magazine` });
  await until('Boolean(document.querySelector(".magazine-feature"))');
  await evaluate('window.__editorialNavigation = 2');
  await evaluate('document.querySelector(".magazine-feature").click()');
  await until('Boolean(document.querySelector(".article-body"))');
  assert.equal(await evaluate('window.__editorialNavigation'), 2);
  for (const path of ['/magazine', '/category/more', ...ARTICLES.map(articleHref)]) {
    await command('Page.navigate', { url: base + path });
    const isArticle = path.startsWith('/magazine/');
    await until(isArticle ? 'Boolean(document.querySelector(".article-body"))' : path === '/magazine' ? 'Boolean(document.querySelector(".magazine-feature"))' : 'document.querySelectorAll(".catalog-card").length === 10');
    await evaluate('[...document.querySelectorAll("main img")].forEach(i=>i.loading="eager")');
    await until('[...document.querySelectorAll("main img")].every(i=>i.complete&&i.naturalWidth>0)');
    assert.equal(await evaluate('document.querySelectorAll("main h1").length'), 1);
    if (isArticle) {
      assert.equal(await evaluate('document.querySelectorAll(".article-section").length'), 4);
      assert.ok(await evaluate('document.querySelectorAll(".article-figure").length >= 1'));
      assert.equal(await evaluate('document.querySelectorAll("link[rel=canonical]").length'), 1);
      assert.equal(await evaluate('document.querySelector("link[rel=canonical]").href'), base + path);
      assert.equal(await evaluate(`JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@type']`), 'Article');
      assert.ok(await evaluate('[...document.querySelectorAll(".article-sidebar nav a")].every(a=>document.getElementById(a.hash.slice(1)))'));
      await evaluate('document.querySelector(".article-sidebar nav a").click()');
      await until('Boolean(location.hash)');
      await command('Page.reload');
      await until('Boolean(document.querySelector(".article-body")) && scrollY > 100');
    }
    for (const width of [320, 375, 768, 1024, 1440]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 });
      for (const dark of [false, true]) {
        await evaluate(`document.documentElement.classList.toggle('dark',${dark})`);
        await wait(80);
        assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'), `${path} overflow at ${width}`);
      }
    }
    for (const width of [375, 1440]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width<768 });
      await evaluate('window.scrollTo({top:0,behavior:"instant"})');
      await wait(150);
      const screenshot=await command('Page.captureScreenshot');
      await writeFile(join(output,`${path.split('/').at(-1)}-${width}.png`),Buffer.from(screenshot.data,'base64'));
    }
  }
  // Article-to-article SPA navigation updates metadata and restores it on exit.
  await evaluate('window.__relatedNavigation=1;document.querySelector(".article-related a").click()');
  await until(`location.pathname===${JSON.stringify(articleHref(ARTICLES[0]))}`);
  assert.equal(await evaluate('window.__relatedNavigation'),1);
  await until(`document.title.startsWith(${JSON.stringify(ARTICLES[0].title)})`);
  await command('Page.navigate', { url: `${base}/magazine/missing` });
  await until('Boolean(document.querySelector(".editorial-missing"))');
  assert.equal(await evaluate('document.querySelector("meta[name=robots]").content'), 'noindex');
  assert.deepEqual(errors, []);
  console.log(`PASS: extra category, four articles, images, SPA links, direct loads, anchors, metadata and five screen widths in both themes. Screenshots: ${output}`);
} finally { socket?.close(); browser.kill(); }
