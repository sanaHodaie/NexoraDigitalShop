import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Check, ChevronDown} from 'lucide-react';

export default function Select({value,onChange,children,disabled=false,className='',...props}) {
  const options=React.Children.toArray(children).map(child=>child.props);
  const selected=options.findIndex(option=>String(option.value)===String(value));
  const [open,setOpen]=useState(false),[active,setActive]=useState(Math.max(0,selected));
  const root=useRef(null),button=useRef(null),menu=useRef(null),id=useId();
  const [position,setPosition]=useState({});
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{
      const box=button.current.getBoundingClientRect(),below=innerHeight-box.bottom-16,above=box.top-16;
      const up=below<180&&above>below,maxHeight=Math.max(80,Math.min(240,up?above:below));
      setPosition({left:Math.max(8,box.left),width:Math.min(box.width,innerWidth-16),maxHeight,...(up?{bottom:innerHeight-box.top+8}:{top:box.bottom+8})});
    };
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open]);
  useEffect(()=>{
    const outside=e=>{if(!root.current?.contains(e.target)&&!menu.current?.contains(e.target))setOpen(false);};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[]);
  useEffect(()=>{if(open)document.getElementById(`${id}-${active}`)?.scrollIntoView({block:'nearest'});},[active,open,id]);
  const choose=index=>{onChange({target:{value:String(options[index].value)}});setOpen(false);button.current?.focus();};
  const key=e=>{
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();setOpen(true);
      setActive(i=>e.key==='Home'?0:e.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,i+(e.key==='ArrowDown'?1:-1))));
    } else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(open)choose(active);else{setActive(Math.max(0,selected));setOpen(true);}}
    else if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);}
    else if(e.key==='Tab')setOpen(false);
  };
  return <div ref={root} className="relative min-w-0" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
    <button {...props} ref={button} type="button" role="combobox" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-activedescendant={open?`${id}-${active}`:undefined} onKeyDown={key} onClick={()=>{setActive(Math.max(0,selected));setOpen(v=>!v);}} className={`flex items-center justify-between gap-3 text-right transition-shadow hover:border-purple-400 disabled:opacity-50 ${className}`}>
      <span className="truncate">{options[selected]?.children || 'انتخاب کنید'}</span><ChevronDown size={17} className={`shrink-0 text-purple-500 transition-transform ${open?'rotate-180':''}`}/>
    </button>
    {open&&createPortal(<div ref={menu} dir="rtl" style={position} id={id} role="listbox" aria-label={props['aria-label'] || 'گزینه‌ها'} className="fixed z-[90] overflow-y-auto overscroll-contain rounded-2xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl shadow-purple-950/15">
      {options.map((option,i)=><div key={option.value} id={`${id}-${i}`} role="option" aria-selected={i===selected} onPointerDown={e=>e.preventDefault()} onMouseEnter={()=>setActive(i)} onClick={()=>choose(i)} className={`flex items-center justify-between gap-3 px-3 py-3 text-sm cursor-pointer rounded-xl transition-colors ${i===active?'bg-purple-100 dark:bg-purple-900/60':''} ${i===selected?'font-bold text-purple-700 dark:text-purple-300':'text-slate-700 dark:text-slate-200'}`}><span>{option.children}</span>{i===selected&&<Check size={16} className="shrink-0"/>}</div>)}
    </div>,document.body)}
  </div>;
}
