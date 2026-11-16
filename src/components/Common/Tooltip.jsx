import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import './tooltip.css';

export default function Tooltip({label, children}) {
 const id=useId(),trigger=useRef(null),bubble=useRef(null);
 const [open,setOpen]=useState(false),[position,setPosition]=useState(null);
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{
   const anchor=trigger.current?.getBoundingClientRect(),tip=bubble.current?.getBoundingClientRect();
   if(!anchor||!tip)return;
   const left=Math.max(8,Math.min(innerWidth-tip.width-8,anchor.left+(anchor.width-tip.width)/2));
   const top=anchor.bottom+10+tip.height<=innerHeight-8?anchor.bottom+10:Math.max(8,anchor.top-tip.height-10);
   setPosition({left,top});
  };
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[open,label]);
 useEffect(()=>{
  if(!open)return;
  const button=trigger.current?.querySelector('button, a');
  if(!button)return;
  const ids=new Set((button.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));
  ids.add(id);button.setAttribute('aria-describedby',[...ids].join(' '));
  return()=>{
   const remaining=(button.getAttribute('aria-describedby')||'').split(/\s+/).filter(value=>value&&value!==id);
   if(remaining.length)button.setAttribute('aria-describedby',remaining.join(' '));else button.removeAttribute('aria-describedby');
  };
 },[open,id]);
 const show=()=>{if(!open)setPosition(null);setOpen(true);};
 return <span ref={trigger} className="nexora-tooltip-trigger"
  onPointerEnter={event=>{if(event.pointerType!=='touch')show();}}
  onPointerLeave={()=>{if(!trigger.current?.querySelector(':focus-visible'))setOpen(false);}}
  onFocus={event=>{if(event.target.matches(':focus-visible'))show();}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}
  onKeyDown={event=>{if(event.key==='Escape')setOpen(false);}}>
  {children}
  {open&&createPortal(<span ref={bubble} id={id} role="tooltip" dir="rtl" className="nexora-tooltip"
   style={{left:position?.left??0,top:position?.top??0,visibility:position?'visible':'hidden'}}>{label}</span>,document.body)}
 </span>;
}
