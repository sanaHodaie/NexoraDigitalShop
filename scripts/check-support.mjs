// Local build integration check; fixture GETs only, no external Telegram navigation.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const base=process.env.NEXORA_UI_URL||'http://127.0.0.1:8093';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const directory=await mkdtemp(join(tmpdir(),'nexora-support-'));
const args=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${directory}`,'--no-first-run','about:blank'];
if(process.env.NEXORA_CHROME_NO_SANDBOX==='1')args.unshift('--no-sandbox');
const browser=spawn(process.env.NEXORA_CHROME||'chromium',args,{stdio:'ignore'});
const content=JSON.parse(await readFile(new URL('../backend/data/site-content.json',import.meta.url),'utf8'));
content.settings={...content.settings,supportEmail:'support@example.test',supportPhone:'۰۲۱۱۲۳۴۵۶۷۸'};
let socket;
try{
 let port;
 for(let i=0;i<100;i++){try{port=(await readFile(join(directory,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await wait(100);}}
 assert.ok(port,'Chromium started');
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 socket=new WebSocket(pages.find(x=>x.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let serial=0;const pending=new Map(),errors=[];
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('Timeout '+method));},20000);pending.set(id,message=>{clearTimeout(timeout);message.error?reject(new Error(JSON.stringify(message.error))):resolve(message.result);});socket.send(JSON.stringify({id,method,params}));});
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){pending.get(message.id)?.(message);pending.delete(message.id);}
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);
  if(message.method!=='Fetch.requestPaused')return;
  const {requestId,request}=message.params;const path=new URL(request.url).pathname;
  if(request.method!=='GET')errors.push('Unexpected write '+path);
  let data={},status=200;
  if(path==='/api/content')data=content;
  else if(path==='/api/products')data=[];
  else if(path==='/api/auth/me'){status=401;data={error:'Not logged in'};}
  else {status=404;data={error:'Missing fixture '+path};}
  command('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(data)).toString('base64')}).catch(e=>errors.push(e.message));
 };
 const evaluate=async expression=>{const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
 const until=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await wait(100);}throw new Error('Condition failed: '+expression);};
 await command('Page.enable');await command('Runtime.enable');await command('Fetch.enable',{patterns:[{urlPattern:new URL(base).origin+'/api/*'}]});
 await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 const navigation=await command('Page.navigate',{url:base});assert.ok(!navigation.errorText,navigation.errorText);await until('!!document.querySelector("footer")');
 await evaluate(`document.querySelector('footer a[href="/support#shipping"]').click()`);
 await until(`location.pathname==='/support'&&!!document.querySelector('#shipping')`);
 await until(`document.querySelector('#shipping').getBoundingClientRect().top>=0&&document.querySelector('#shipping').getBoundingClientRect().top<250`);
 assert.equal(await evaluate('document.title'),'پشتیبانی و راهنمای خرید | نکسورا');
 assert.ok(await evaluate(`!!document.querySelector('meta[name="description"]')&&document.querySelector('link[rel="canonical"]').href.endsWith('/support')`));
 const links=await evaluate(`[...document.querySelectorAll('a[href^="https://t.me/"]')].map(x=>({href:x.href,target:x.target,rel:x.rel}))`);
 assert.ok(links.length>=5);
 assert.ok(links.every(x=>x.href==='https://t.me/NexoraShopHelperBot'&&x.target==='_blank'&&x.rel.includes('noopener')));
 for(const section of ['faq','shipping','damaged-goods','returns','warranty','tracking','contact']){
  assert.ok(await evaluate(`!!document.querySelector('footer a[href="/support#${section}"]')&&!!document.getElementById('${section}')`));
 }
 await until(`!!document.querySelector('a[href="tel:02112345678"]')`);
 assert.ok(await evaluate(`!!document.querySelector('a[href="mailto:support@example.test"]')`));
 await evaluate(`document.querySelector('#faq summary').click()`);assert.ok(await evaluate(`document.querySelector('#faq details').open`));
 await mkdir('/tmp/nexora-support-shots',{recursive:true});
 for(const width of [320,390,768,1440]){
  await command('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate('window.scrollTo(0,0)');await wait(150);
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'No overflow '+width);
  if([390,1440].includes(width))await writeFile(`/tmp/nexora-support-shots/support-${width}.png`,Buffer.from((await command('Page.captureScreenshot')).data,'base64'));
 }
 await evaluate(`localStorage.setItem('nexora_theme','dark')`);await command('Page.reload');await until(`document.body?.querySelector('.support-page')&&document.documentElement.classList.contains('dark')`);
 await evaluate('window.scrollTo(0,0)');await writeFile('/tmp/nexora-support-shots/support-dark.png',Buffer.from((await command('Page.captureScreenshot')).data,'base64'));
 assert.deepEqual(errors,[]);
 console.log('PASS: footer support navigation, lazy-loaded hash anchors, exact Telegram links, FAQ interaction, configured email/normalized phone, metadata, dark theme and 320/390/768/1440px layout. Fixture GETs only.');
}finally{
 socket?.close();browser.kill();if(browser.exitCode===null)await new Promise(resolve=>browser.once('exit',resolve));await rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:100});
}
