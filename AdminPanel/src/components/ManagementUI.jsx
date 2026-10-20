import React, {useCallback, useEffect, useRef, useState} from 'react';
import {RefreshCw, AlertCircle} from 'lucide-react';
import {api} from '../api';
export {formatPrice as money} from '../../../src/lib/money';
export const number = n => new Intl.NumberFormat('fa-IR').format(n || 0);
export const date = n => n ? new Intl.DateTimeFormat('fa-IR', {dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'}).format(new Date(n)) : 'ثبت نشده';
export const inputClass = 'w-full rounded-2xl bg-slate-50 dark:bg-slate-800 border border-purple-100 dark:border-purple-900/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 min-w-0';
export function Button({children, secondary=false, ...props}) {
  return <button {...props} className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${secondary ? 'bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'} ${props.className || ''}`}>{children}</button>;
}
export function Panel({children, className=''}) {return <section className={`glass-panel p-4 sm:p-6 min-w-0 ${className}`}>{children}</section>;}
export function Heading({title, subtitle, children}) {return <div className="flex flex-wrap items-center justify-between gap-4 mb-6"><div><h1 className="text-xl sm:text-2xl font-black">{title}</h1><p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-6">{subtitle}</p></div>{children}</div>;}
export function ErrorBox({message}) {return message ? <div role="alert" className="rounded-2xl p-4 mb-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm flex gap-2"><AlertCircle size={18}/>{message}</div> : null;}
export function Field({label,children}) {return <label className="block space-y-2 min-w-0"><span className="text-xs font-bold">{label}</span>{children}</label>;}
export function Empty({children='داده‌ای برای نمایش وجود ندارد.'}) {return <p className="py-12 text-center text-sm text-slate-500">{children}</p>;}
export function Pager({data, page, setPage}) {return <div className="flex flex-wrap gap-3 items-center justify-center mt-6 text-xs"><Button secondary disabled={page<=1} onClick={()=>setPage(p=>p-1)}>قبلی</Button><span>صفحه {number(page)} · {number(data?.total)} نتیجه</span><Button secondary disabled={!data || page*data.pageSize>=data.total} onClick={()=>setPage(p=>p+1)}>بعدی</Button></div>;}
export function useResource(path) {
  const [state,setState] = useState({data:null,error:'',loading:true});
  const [version,setVersion] = useState(0);
  const reload = useCallback(()=>setVersion(v=>v+1),[]);
  useEffect(()=>{
    const controller = new AbortController(); setState({data:null,error:'',loading:true});
    api(path,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({data,error:'',loading:false});})
      .catch(error=>{if(!controller.signal.aborted)setState({data:null,error:error.message,loading:false});});
    return ()=>controller.abort();
  },[path,version]);
  return {...state,reload};
}
export function LoadState({loading,error,reload}) {return <><ErrorBox message={error}/>{error && <Button secondary onClick={reload}>تلاش مجدد</Button>}{loading && <p role="status" className="p-8 text-sm flex gap-2"><RefreshCw size={16} className="animate-spin"/>در حال دریافت اطلاعات…</p>}</>;}
export function Modal({title,onClose,children}) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(()=>{
    const previous=document.activeElement;
    const dialogs=document.querySelectorAll('[role="dialog"]');
    const dialog=dialogs[dialogs.length-1];
    const controls=()=>Array.from(dialog?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') || []).filter(element=>element.getClientRects().length);
    controls()[0]?.focus();
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();close.current();}
      if(e.key==='Tab'){
        const items=controls(),first=items[0],last=items[items.length-1];
        if(!first){e.preventDefault();return;}
        if(e.shiftKey && (document.activeElement===first || !dialog?.contains(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey && (document.activeElement===last || !dialog?.contains(document.activeElement))){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);previous?.focus();};
  },[]);
  return <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"><section role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 shadow-2xl"><header className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 bg-purple-50 dark:bg-slate-900 border-b border-purple-100 dark:border-purple-800"><h2 className="font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="بستن" className="p-2">✕</button></header><div className="p-5 sm:p-6">{children}</div></section></div>;
}
