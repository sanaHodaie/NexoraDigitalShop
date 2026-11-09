import {api,write} from '../api';
import React,{useEffect,useState} from 'react';
import {Heading,Panel,Pager,LoadState,Empty,useResource,inputClass,number,date,Button} from './ManagementUI';
export default function Subscribers(){
 const [q,setQ]=useState(''),[page,setPage]=useState(1),[revision,setRevision]=useState(0);
 const [news,setNews]=useState(null),[error,setError]=useState('');
 const resource=useResource(`/admin/subscribers?page=${page}&q=${encodeURIComponent(q)}`);
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)resource.reload();},15000);return()=>clearInterval(timer);},[resource.reload]);
 useEffect(()=>{const controller=new AbortController();
  api('/admin/newsletter-notifications',{signal:controller.signal}).then(async data=>{
   if(controller.signal.aborted)return;setNews(data);
   await write('/admin/newsletter-notifications/read','POST',{throughId:data.latestId});
   if(!controller.signal.aborted){setNews({...data,unread:0,items:data.items.map(item=>({...item,unread:false}))});window.dispatchEvent(new Event('nexora:newsletter-read'));}
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();
 },[revision]);
 return <div className="space-y-6"><Heading title="اعضای خبرنامه" subtitle="ایمیل واردشده در فرم، حساب ثبت‌کننده و زمان عضویت · به‌روزرسانی هر ۱۵ ثانیه"><Button secondary onClick={()=>{resource.reload();setRevision(v=>v+1);}}>به‌روزرسانی</Button></Heading>
  <Panel><input className={inputClass} aria-label="جستجوی اعضای خبرنامه" placeholder="ایمیل خبرنامه، نام یا ایمیل حساب کاربر…" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/></Panel>
  {error&&<div><p role="alert" className="text-rose-600">{error}</p><Button secondary onClick={()=>{setError('');setRevision(v=>v+1);}}>تلاش دوباره برای اعلان‌ها</Button></div>}
  {news&&<Panel><h2 className="font-bold mb-4">آخرین عضویت‌ها</h2><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{news.items.map(item=><div key={item.id} className="rounded-2xl p-3 bg-blue-50 dark:bg-slate-800"><strong className="text-sm">{item.name||'کاربر فروشگاه'}</strong>{item.unread&&<span className="text-xs text-blue-600 mr-2">جدید</span>}<p dir="ltr" className="text-xs break-all my-2">{item.email}</p><p className="text-xs text-slate-500">{date(item.createdAt)}</p></div>)}</div></Panel>}
  <LoadState {...resource}/>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{resource.data?.items.map(u=><Panel key={u.id} className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-sm font-bold">عضویت #{number(u.id)}</h2><span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-3 py-1">ثبت‌شده</span></div><div><p className="text-xs text-slate-500 mb-2">ایمیل واردشده در خبرنامه</p><p dir="ltr" className="text-sm font-bold break-all text-left text-purple-700 dark:text-purple-300">{u.email}</p></div><div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2"><p className="text-xs text-slate-500">حساب ثبت‌کننده</p><p className="text-sm font-bold">{u.userName || (u.userId?'کاربر نکسورا':'عضویت قدیمی؛ حساب مشخص نیست')}</p>{u.accountEmail&&<p dir="ltr" className="text-xs break-all text-left">{u.accountEmail}</p>}</div><p className="text-xs text-slate-500">زمان عضویت: {date(u.createdAt)}</p></Panel>)}</div>
  {resource.data?.items.length===0&&<Empty/>}<Pager data={resource.data} page={page} setPage={setPage}/>
 </div>;
}
