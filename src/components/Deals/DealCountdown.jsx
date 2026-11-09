import React, {useEffect, useState} from 'react';
import {Timer} from 'lucide-react';
import './countdown.css';

// A daily clock, not a promise that product prices expire at midnight.
function remainingToday() {
 const now=new Date();
 const midnight=new Date(now);midnight.setHours(24,0,0,0);
 return Math.max(0,Math.ceil((midnight-now)/1000));
}
export default function DealCountdown() {
 const [seconds,setSeconds]=useState(remainingToday);
 useEffect(()=>{
  const update=()=>setSeconds(remainingToday());
  const timer=setInterval(update,1000);
  document.addEventListener('visibilitychange',update);
  return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',update);};
 },[]);
 const values=[Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60];
 const labels=['ساعت','دقیقه','ثانیه'];
 const persian=value=>String(value).padStart(2,'0').replace(/\d/g,n=>'۰۱۲۳۴۵۶۷۸۹'[n]);
 return <div className="deal-countdown">
  <div className="deal-countdown-heading"><Timer size={16}/><span>تا پایان امروز</span><i aria-hidden="true"/></div>
  <div className="deal-countdown-clock" role="timer" aria-live="off" aria-label={values.map((v,i)=>`${v} ${labels[i]}`).join(' و ')} dir="ltr">
   {values.map((value,index)=><React.Fragment key={labels[index]}>{index>0&&<span className="deal-countdown-colon" aria-hidden="true">:</span>}<div className="deal-countdown-unit"><div className="deal-countdown-digits"><span key={value}>{persian(value)}</span></div><span className="deal-countdown-label">{labels[index]}</span></div></React.Fragment>)}
  </div>
  <p className="deal-countdown-note">قیمت و موجودی نهایی هنگام ثبت سفارش تأیید می‌شود.</p>
 </div>;
}
