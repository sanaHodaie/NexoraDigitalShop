// Reproducible local built-app benchmark. Fixture GETs only; no live accounts/data.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,extname,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
const args=process.argv.slice(2), option=(name,fallback)=>args[args.indexOf(name)+1]||fallback;
const root=resolve(args.includes('--root')?option('--root'): 'dist');
const label=args.includes('--label')?option('--label'):'current';
assert.match(label,/^[a-zA-Z0-9_-]+$/,'Use a plain report label');
const products=[...JSON.parse(await readFile('backend/data/products.json','utf8')),...JSON.parse(await readFile('backend/data/catalog-products.json','utf8'))];
const content=JSON.parse(await readFile('backend/data/site-content.json','utf8'));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.ttf':'font/ttf','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const cache=new Map();let catalogueRequests=0;
const server=createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 if(pathname.startsWith('/api/')){
  let data={},status=200;
  if(pathname==='/api/products'){catalogueRequests++;await pause(750);data=products;}
  else if(pathname==='/api/content')data=content;
  else if(pathname==='/api/auth/me'){status=401;data={error:'Logged out',code:'UNAUTHENTICATED'};}
  else{status=404;data={error:'Missing fixture'};}
  const body=gzipSync(JSON.stringify(data));res.writeHead(status,{'Content-Type':'application/json','Content-Encoding':'gzip','Content-Length':body.length});res.end(body);return;
 }
 let path=resolve(root,'.'+pathname);if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
 if(!extname(path))path=join(root,'index.html');
 if(!cache.has(path)){
  let data=await readFile(path);const type=mime[extname(path)]||'application/octet-stream';const gzip=['.html','.js','.css'].includes(extname(path));if(gzip)data=gzipSync(data);
  cache.set(path,{data,type,gzip});
 }
 const {data,type,gzip}=cache.get(path);res.writeHead(200,{'Content-Type':type,'Content-Length':data.length,...(gzip?{'Content-Encoding':'gzip'}:{})});res.end(data);
 }catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const profile=await mkdtemp(join(tmpdir(),'nexora-perf-'));
const browser=spawn(process.env.NEXORA_CHROME||'chromium',['--headless=new',...(process.env.NEXORA_CHROME_NO_SANDBOX==='1'?['--no-sandbox']:[]),'--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let socket;
try{
 let port;for(let i=0;i<100;i++){try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await pause(100);}}
 assert.ok(port);
 const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();socket=new WebSocket(targets.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((ok,no)=>{socket.onopen=ok;socket.onerror=no;});
 let next=0;const pending=new Map(), requests=new Map();let failures=[],jsErrors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}return;}
 if(m.method==='Network.requestWillBeSent')requests.set(m.params.requestId,{url:m.params.request.url,type:m.params.type,bytes:0});
 if(m.method==='Network.loadingFinished'){const r=requests.get(m.params.requestId);if(r)r.bytes=m.params.encodedDataLength;}
 if(m.method==='Runtime.exceptionThrown')jsErrors.push(m.params.exceptionDetails.text);
 if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!m.params.response.url.includes('/api/auth/me'))failures.push(m.params.response.url);
 };
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const until=async expression=>{for(let i=0;i<600;i++){if(await evaluate(expression))return;await pause(100);}throw new Error('Timeout: '+expression);};
 await command('Page.enable');await command('Runtime.enable');await command('Network.enable');
 await command('Network.setCacheDisabled',{cacheDisabled:true});
 await command('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*','https://images.unsplash.com/*']});
 await command('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:180*1024,uploadThroughput:100*1024,connectionType:'cellular4g'});
 await command('Emulation.setCPUThrottlingRate',{rate:4});
 await command('Page.addScriptToEvaluateOnNewDocument',{source:`try{localStorage.clear()}catch{};window.__cardsAt=0;new MutationObserver(()=>{if(!window.__cardsAt&&document.querySelectorAll('.catalog-card').length)window.__cardsAt=performance.now()}).observe(document,{subtree:true,childList:true});`});
 const results=[];
 for(const viewport of [{width:390,dpr:2,name:'mobile'},{width:1440,dpr:1,name:'desktop'}]){
  for(let run=1;run<=2;run++){
   await command('Page.navigate',{url:'about:blank'});requests.clear();failures=[];jsErrors=[];const previous=catalogueRequests;
   await command('Emulation.setDeviceMetricsOverride',{width:viewport.width,height:900,deviceScaleFactor:viewport.dpr,mobile:viewport.name==='mobile'});
   await command('Page.navigate',{url:base+'/category/audio'});
   await until(`document.querySelectorAll('.catalog-card').length===10`);
   await until(`[...document.querySelectorAll('.catalog-card img')].slice(0,4).every(i=>i.complete&&i.naturalWidth>0)`);
   const first=await evaluate(`({cards:window.__cardsAt,first4:performance.now(),fonts:document.fonts.status,overflow:document.documentElement.scrollWidth>innerWidth+1})`);
   await evaluate(`[...document.querySelectorAll('.catalog-card img')].forEach(i=>i.loading='eager')`);
   await until(`[...document.querySelectorAll('.catalog-card img')].every(i=>i.complete&&i.naturalWidth>0)`);
   const all=await evaluate(`({all10:performance.now(),sources:[...document.querySelectorAll('.catalog-card img')].map(i=>i.currentSrc)})`);
   const transfers=[...requests.values()].filter(r=>r.url.startsWith(base));
   assert.deepEqual(failures,[]);assert.deepEqual(jsErrors,[]);assert.equal(catalogueRequests-previous,1);assert.ok(!first.overflow);
   results.push({viewport:viewport.name,run,cardsMs:Math.round(first.cards),first4Ms:Math.round(first.first4),all10Ms:Math.round(all.all10),imageBytes:Math.round(transfers.filter(r=>r.type==='Image').reduce((s,r)=>s+r.bytes,0)),totalBytes:Math.round(transfers.reduce((s,r)=>s+r.bytes,0)),catalogueRequests:catalogueRequests-previous});
   console.log(label,JSON.stringify(results.at(-1)));
  }
 }
 await writeFile(join(tmpdir(),`nexora-performance-${label}.json`),JSON.stringify({conditions:{apiDelayMs:750,latencyMs:100,downloadKiBps:180,cpuSlowdown:4},results},null,2)+'\n');
}finally{server.close();socket?.close();browser.kill();if(browser.exitCode===null)await new Promise(r=>browser.once('exit',r));await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
