import React,{useEffect,useState} from 'react';
import {Heading,Panel,Pager,LoadState,Empty,useResource,inputClass,number,date,Button} from './ManagementUI';
export default function Subscribers(){
 const [q,setQ]=useState(''),[page,setPage]=useState(1);
 const resource=useResource(`/admin/subscribers?page=${page}&q=${encodeURIComponent(q)}`);
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)resource.reload();},15000);return()=>clearInterval(timer);},[resource.reload]);
 return <div className="space-y-6"><Heading title="اعضای خبرنامه" subtitle="ایمیل واردشده در فرم، حساب ثبت‌کننده و زمان عضویت · به‌روزرسانی هر ۱۵ ثانیه"><Button secondary onClick={resource.reload}>به‌روزرسانی</Button></Heading>
  <Panel><input className={inputClass} aria-label="جستجوی اعضای خبرنامه" placeholder="ایمیل خبرنامه، نام یا ایمیل حساب کاربر…" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/></Panel>
  <LoadState {...resource}/>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{resource.data?.items.map(u=><Panel key={u.id} className="space-y-4"><div className="flex justify-between items-center"><h2 className="text-sm font-bold">عضویت #{number(u.id)}</h2><span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-3 py-1">ثبت‌شده</span></div><div><p className="text-xs text-slate-500 mb-2">ایمیل واردشده در خبرنامه</p><p dir="ltr" className="text-sm font-bold break-all text-left text-purple-700 dark:text-purple-300">{u.email}</p></div><div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2"><p className="text-xs text-slate-500">حساب ثبت‌کننده</p><p className="text-sm font-bold">{u.userName || (u.userId?'کاربر نکسورا':'عضویت قدیمی؛ حساب مشخص نیست')}</p>{u.accountEmail&&<p dir="ltr" className="text-xs break-all text-left">{u.accountEmail}</p>}</div><p className="text-xs text-slate-500">زمان عضویت: {date(u.createdAt)}</p></Panel>)}</div>
  {resource.data?.items.length===0&&<Empty/>}<Pager data={resource.data} page={page} setPage={setPage}/>
 </div>;
}
