import React, {useEffect, useId, useRef, useState} from 'react';
import {Search, X, LoaderCircle} from 'lucide-react';
import {api} from '../api';
import {money} from './ManagementUI';

export default function AdminSearch({onSearch}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const root = useRef(null), input = useRef(null);
  const id = useId();
  const term = query.trim();
  useEffect(() => {
    setItems([]);setActive(-1);setError('');
    if (!open || !term) {setLoading(false);return;}
    const controller = new AbortController();setLoading(true);
    const timer = setTimeout(() => {
      api(`/admin/products?size=6&q=${encodeURIComponent(term)}`, {signal:controller.signal,cache:'no-store'})
        .then(data => {if(!controller.signal.aborted)setItems(data.items);})
        .catch(e => {if(!controller.signal.aborted)setError(e.message);})
        .finally(() => {if(!controller.signal.aborted)setLoading(false);});
    }, 250);
    return () => {clearTimeout(timer);controller.abort();};
  }, [term,open]);
  useEffect(() => {
    const outside = event => {if(!root.current?.contains(event.target))setOpen(false);};
    const shortcut = event => {
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&input.current?.getClientRects().length){
        event.preventDefault();input.current.focus();setOpen(true);
      }
    };
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',shortcut);
    return () => {document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',shortcut);};
  }, []);
  useEffect(()=>{if(active>=0)document.getElementById(`${id}-${active}`)?.scrollIntoView({block:'nearest'});},[active,id]);
  const choose = product => {setQuery(product.name);setOpen(false);onSearch?.(product.id);};
  const visible = open && Boolean(term);
  return <div ref={root} className="relative min-w-0 flex-1" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} dir="rtl">
    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-purple-100 dark:border-purple-900 focus-within:border-purple-400">
      <Search size={16} className="shrink-0 text-purple-500"/>
      <input ref={input} type="text" inputMode="search" role="combobox" autoComplete="off" maxLength={100} aria-label="جستجوی محصولات پنل" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible?id:undefined} aria-activedescendant={visible&&active>=0?`${id}-${active}`:undefined}
        className="w-full min-w-0 bg-transparent outline-none text-xs text-slate-800 dark:text-slate-100" placeholder="نام، مدل، برند یا شناسهٔ محصول…" value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setOpen(true);setItems([]);setActive(-1);}}
        onKeyDown={e=>{
          if(e.nativeEvent.isComposing)return;
          if(e.key==='Escape'){e.preventDefault();setOpen(false);setActive(-1);}
          else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(i=>items.length?Math.max(0,Math.min(items.length-1,i+(e.key==='ArrowDown'?1:-1))):-1);}
          else if(e.key==='Enter'){e.preventDefault();if(visible&&active>=0&&items[active])choose(items[active]);else if(term){setOpen(false);onSearch?.(term);}}
        }}/>
      {loading&&visible?<LoaderCircle size={15} className="animate-spin shrink-0 text-purple-500"/>:query&&<button type="button" aria-label="پاک کردن جستجوی پنل" onClick={()=>{setQuery('');setItems([]);setActive(-1);input.current?.focus();}} className="shrink-0 p-1 text-slate-500"><X size={14}/></button>}
    </div>
    {visible&&<div className="absolute top-full mt-2 inset-x-0 z-50 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900 rounded-2xl shadow-xl overflow-hidden">
      <ul id={id} role="listbox" aria-label="پیشنهاد محصولات" className="max-h-[min(55dvh,360px)] overflow-y-auto">
        {items.map((p,i)=><li id={`${id}-${i}`} key={p.id} role="option" aria-selected={active===i} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(p)} onMouseMove={()=>setActive(i)} className={`flex gap-3 p-3 cursor-pointer border-b border-slate-100 dark:border-slate-800 ${active===i?'bg-purple-50 dark:bg-purple-950/50':''}`}>
          <img src={p.image} alt="" width="40" height="40" className="!w-10 !h-10 shrink-0 object-contain rounded-lg bg-white"/>
          <div className="min-w-0 flex-1 text-xs"><strong className="block leading-6 break-words">{p.name}</strong><span className="block text-slate-400 break-all" dir="ltr">{p.id}</span><span className="block text-purple-700 dark:text-purple-300 mt-1">{money(p.price)}{!p.isActive?' · بایگانی':''}</span></div>
        </li>)}
      </ul>
      <div role="status" className="text-xs text-slate-500 px-3 py-2">{loading?'در حال جستجو…':error||(!items.length?'محصولی پیدا نشد.':'با کلیدهای بالا و پایین انتخاب و با Enter تأیید کنید.')}</div>
      {!loading&&!error&&<button className="w-full text-xs text-purple-700 dark:text-purple-300 border-t border-purple-100 dark:border-purple-900 py-3" onClick={()=>{setOpen(false);onSearch?.(term);}}>نمایش همهٔ نتایج</button>}
    </div>}
  </div>;
}
