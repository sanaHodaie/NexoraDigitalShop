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
  await command('Page.bringToFront');
  await command('Network.enable');
  await command('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*', 'https://images.unsplash.com/*'] });

  let catalogueRequests = 0;
  const requests = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if(message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url; requests.push(url);
      if(new URL(url).pathname === '/api/products') catalogueRequests++;
    }
  });
  await command('Emulation.setDeviceMetricsOverride', {width:375,height:812,deviceScaleFactor:1,mobile:true});
  await command('Page.navigate', {url: `${base}/category/smartphones`});
  await until('document.querySelectorAll(".catalog-card").length === 10');
  assert.equal(catalogueRequests,1,'Single initial request even under React StrictMode');
  assert.equal(requests.some(url=>url.includes('/components/Modals/QuickViewModal')),false,'Preview code is deferred');
  await evaluate('document.querySelector(".catalog-breadcrumb a").click()');
  await until('Boolean(document.querySelector("#trending"))');
  await evaluate(`document.querySelector('a[href="/category/laptops"]').click()`);
  await until('document.querySelectorAll(".catalog-card").length === 10');
  assert.equal(catalogueRequests,1,'Navigation reuses catalogue');
  await evaluate('document.querySelector(".catalog-detail").click()');
  await until('Boolean(document.querySelector(".quick-view-panel"))');
  await wait(450);
  await evaluate('document.querySelector(".quick-view-panel button").click()');
  await until('!document.querySelector(".quick-view-panel")');
  await evaluate('window.__beforeReload = true');
  await command('Page.reload');
  await until('!window.__beforeReload && document.querySelectorAll(".catalog-card").length === 10');
  assert.equal(catalogueRequests,1,'Fresh public cache survives reload');
  await evaluate(`const key='nexora:catalog:v1'; const saved=JSON.parse(sessionStorage.getItem(key));saved.updatedAt=Date.now()-61000; sessionStorage.setItem(key,JSON.stringify(saved));`);
  await command('Network.setBlockedURLs',{urls:[`${base}/api/products`,'https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await evaluate('window.__beforeReload = true');
  await command('Page.reload');
  await until('!window.__beforeReload && document.querySelectorAll(".catalog-card").length === 10 && Boolean(document.querySelector(".catalog-demo-note[role=status]"))');
  assert.equal(await evaluate('document.querySelectorAll(".catalog-skeleton").length'),0,'Failed background refresh keeps cards visible');
  assert.deepEqual(errors,[]);
  console.log('PASS: one initial catalogue request, no refetch on navigation/fresh reload, deferred modal, and cached cards survive failed background refresh.');
} finally { socket?.close(); browser.kill(); }
