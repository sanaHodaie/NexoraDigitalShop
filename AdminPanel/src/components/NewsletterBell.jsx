import React,{useEffect,useState} from 'react';
import {Bell} from 'lucide-react';
import {api} from '../api';
export default function NewsletterBell({onOpen}) {
 const [unread,setUnread]=useState(0),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();let busy=false;
  const load=async()=>{if(busy||document.hidden)return;busy=true;try{const data=await api('/admin/newsletter-notifications',{signal:controller.signal});if(!controller.signal.aborted){setUnread(data.unread);setError('');}}catch(e){if(!controller.signal.aborted)setError(e.message);}finally{busy=false;}};
  load();const timer=setInterval(load,30000);window.addEventListener('nexora:newsletter-read',load);document.addEventListener('visibilitychange',load);
  return()=>{controller.abort();clearInterval(timer);window.removeEventListener('nexora:newsletter-read',load);document.removeEventListener('visibilitychange',load);};
 },[]);
 return <button type="button" onClick={onOpen} aria-label={`اعلان‌های خبرنامه، ${unread} خوانده‌نشده`} title={error||'اعلان‌های خبرنامه'} className="relative p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-blue-600 dark:text-blue-300">
  <Bell size={20} className={unread?'newsletter-bell-unread':''}/>{unread>0&&<span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] grid place-items-center px-1">{unread>99?'۹۹+':new Intl.NumberFormat('fa-IR').format(unread)}</span>}
  {error&&<span className="absolute -bottom-1 left-0 text-rose-500" aria-label="خطای دریافت اعلان‌ها">!</span>}
 </button>;
}
