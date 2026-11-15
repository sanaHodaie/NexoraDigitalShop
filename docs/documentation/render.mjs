// Export self-contained local HTML to tagged PDF using Chromium; no external requests.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:http';
const server=createServer(async(req,res)=>{
 try{const name=req.url?.split('?')[0];if(!/^\/Nexora-Documentation-(FA|EN)\.html$/.test(name)){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(resolve('docs/exports'+name)));
 }catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const dir=await mkdtemp(join(tmpdir(),'nexora-docs-'));
const browser=spawn(process.env.NEXORA_CHROME||'chromium',['--no-sandbox','--headless=new','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${dir}`,'--no-first-run','about:blank'],{stdio:'ignore'});
let socket;
try{
 let port;
 for(let n=0;n<150;n++){try{port=(await readFile(join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await wait(100);}}
 assert.ok(port,'Chromium startup');
 const pages=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
 socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise((ok,fail)=>{socket.onopen=ok;socket.onerror=fail;});
 let seq=0;const pending=new Map();
 const errors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);};
 const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await command('Runtime.enable');await command('Page.enable');
 await command('Emulation.setEmulatedMedia',{media:'print'});
 const reports=[];
 for(const lang of ['FA','EN']){
  const url=base+`/Nexora-Documentation-${lang}.html`;
  const navigation=await command('Page.navigate',{url});assert.ok(!navigation.errorText,navigation.errorText);
  let ready=false;
  for(let n=0;n<200;n++){if(await evaluate('document.documentElement?.dataset.ready==="true"')){ready=true;break;}await wait(100);}
  assert.ok(ready,'Pagination completed '+lang+' '+JSON.stringify(errors)+' '+await evaluate('location.href'));
  const result=await evaluate('window.DOC_RESULT');
  console.log(lang,JSON.stringify(result));
  assert.deepEqual(result.warnings,[],`${lang} overflow`);
  assert.deepEqual(errors,[],`${lang} script errors`);
  const pdf=await command('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,generateTaggedPDF:true,generateDocumentOutline:true,displayHeaderFooter:false,marginTop:0,marginBottom:0,marginLeft:0,marginRight:0});
  await writeFile(resolve(`docs/exports/Nexora-Documentation-${lang}.pdf`),Buffer.from(pdf.data,'base64'));
  reports.push({language:lang,...result});
 }
 await writeFile('docs/documentation/render-report.json',JSON.stringify(reports,null,2)+'\n');
}finally{
 server.close();socket?.close();browser.kill();if(browser.exitCode===null)await new Promise(resolve=>browser.once('exit',resolve));await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
