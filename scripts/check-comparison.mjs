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
  await command('Page.navigate',{url:base+'/category/laptops'});
  await until(`document.querySelectorAll('.catalog-card .compare-toggle').length>=4`);
  await evaluate(`Array.from(document.querySelectorAll('.catalog-card .compare-toggle')).slice(0,3).forEach(b=>b.click())`);
  await until(`document.querySelectorAll('.catalog-card .compare-toggle[aria-pressed="true"]').length===3`);
  await evaluate(`document.querySelectorAll('.catalog-card .compare-toggle')[3].click()`);
  await until(`Boolean(document.querySelector('.compare-alert'))`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('nexora:compare:v1')).length`),3);
  await evaluate(`document.querySelector('.compare-alert button').click();document.querySelector('.compare-tray a').click()`);
  await until(`document.querySelectorAll('.compare-product').length===3`);
  assert.equal(await evaluate(`document.querySelectorAll('.compare-table-scroll thead th').length`),4);
  await evaluate(`document.querySelector('.compare-details input[type="checkbox"]').click()`);
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('.compare-table-scroll tbody tr')).every(row=>row.classList.contains('compare-difference'))`),true);
  await evaluate(`document.querySelector('.compare-details input[type="checkbox"]').click()`);
  for(const width of [320,375,768,1440]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Comparison overflow ${width}`);
    await writeFile(join(output,`comparison-${width}.png`),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  }
  await evaluate(`document.documentElement.classList.add('dark')`);
  await wait(400); // Let the site's theme transition finish before the visual capture.
  await writeFile(join(output,'comparison-dark.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  await command('Page.reload');
  await until(`document.querySelectorAll('.compare-product').length===3`);
  const oldIds=await evaluate(`JSON.parse(localStorage.getItem('nexora:compare:v1'))`);
  await evaluate(`document.querySelector('.compare-product-actions button:last-child').click()`);
  await until(`Boolean(document.querySelector('.compare-picker-results button'))`);
  await evaluate(`document.querySelector('.compare-picker-results button').click()`);
  await until(`document.querySelectorAll('.compare-product').length===3 && !document.querySelector('.compare-picker')`);
  const newIds=await evaluate(`JSON.parse(localStorage.getItem('nexora:compare:v1'))`);
  assert.equal(newIds.includes(oldIds[0]),false);
  await evaluate(`document.querySelector('.compare-remove').click()`);
  await until(`document.querySelectorAll('.compare-product').length===2`);
  await command('Page.navigate',{url:base+'/category/smartphones'});
  await until(`Boolean(document.querySelector('.catalog-card .compare-toggle'))`);
  await evaluate(`document.querySelector('.catalog-card .compare-toggle').click()`);
  await until(`Boolean(document.querySelector('.compare-alert'))`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('nexora:compare:v1')).length`),2);
  await evaluate(`document.querySelector('.compare-alert button').click();document.querySelector('.compare-tray-clear').click()`);
  await until(`!document.querySelector('.compare-tray')`);
  await evaluate(`Array.from(document.querySelectorAll('.catalog-card .compare-toggle')).slice(0,3).forEach(b=>b.click())`);
  await until(`document.querySelectorAll('.compare-tray-products img').length===3 && Array.from(document.querySelectorAll('.compare-tray-products img')).every(img=>img.complete && img.naturalHeight>0)`);
  for (const width of [320,375,768,1440]) {
    await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true,`Tray overflow ${width}`);
    assert.equal(await evaluate(`(() => {
      const tray=document.querySelector('.compare-tray').getBoundingClientRect();
      return Array.from(document.querySelectorAll('.compare-tray img, .compare-tray button, .compare-tray a')).every(el=>{
        const rect=el.getBoundingClientRect();
        if (!rect.width || !rect.height) return true;
        return rect.top>=tray.top && rect.bottom<=tray.bottom && rect.left>=tray.left && rect.right<=tray.right;
      });
    })()`),true,`Phone thumbnails and controls contained at ${width}`);
  }
  await writeFile(join(output,'comparison-phone-tray.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png'})).data,'base64'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,screenshots:output,checks:['select three','limit','same category','persist reload','replace','remove','difference filter','320/375/768/1440 overflow']}));
} finally {
  socket?.close();
  browser.kill();
}
