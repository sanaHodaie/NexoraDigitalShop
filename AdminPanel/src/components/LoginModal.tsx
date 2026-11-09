import React, {useEffect,useState} from 'react';
import {LockKeyhole, Eye, EyeOff, Sun, Moon, BarChart3, ShoppingBag, Box, Users, Monitor, Zap, ShieldCheck, ArrowRight} from 'lucide-react';
import {api, write, resetCsrf} from '../api';
import './login.css';

export default function LoginModal({isOpen,onLoginSuccess,themeMode,onToggleTheme,initialError=''}: {
  isOpen:boolean; onLoginSuccess:(user:any)=>void; themeMode?:string; onToggleTheme?:()=>void; initialError?:string;
}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[visible,setVisible]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(initialError);
  const [connection,setConnection]=useState(false),[health,setHealth]=useState(''),[checking,setChecking]=useState(false);
  const [systemDark,setSystemDark]=useState(()=>matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(()=>{const media=matchMedia('(prefers-color-scheme: dark)');const change=()=>setSystemDark(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
  if(!isOpen)return null;
  const login=async(e:React.FormEvent)=>{
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try {await write('/auth/login','POST',{email:email.trim(),password});resetCsrf();const manager=await api('/admin/me');setPassword('');onLoginSuccess(manager);}
    catch(e){setError(e instanceof Error?e.message:'ورود موفق نبود.');}finally{setBusy(false);}
  };
  const dark=themeMode==='dark'||(themeMode==='auto'&&systemDark);
  return <main className="admin-login" dir="rtl">
    <div className="admin-login-inner">
      <header className="login-header"><div className="login-brand"><b>N</b><span>NEXORA<small>BUSINESS CONTROL</small></span></div>
        <button type="button" className="login-theme" onClick={onToggleTheme} aria-label={dark?'فعال کردن حالت روشن':'فعال کردن حالت تیره'}>{dark?<Sun size={22}/>:<Moon size={22}/>}</button>
      </header>
      <div className="login-columns">
        <section className="login-story" aria-label="معرفی پنل مدیریت">
          <p className="login-pill"><BarChart3 size={18}/>راهکار جامع مدیریت فروشگاه</p>
          <h1>مدیریت فروشگاه،<br/>با <em>دیدی روشن‌تر</em></h1>
          <p className="login-description">سفارش‌ها، محصولات، گفت‌وگوهای مشتریان و گزارش‌ها را در یک فضای یکپارچه و امن مدیریت کنید.</p>
          <div className="login-artwork"><div className="login-laptop-hover"><img className="login-laptop" src="/assets/admin/login-laptop.webp" alt="تصویر لپ‌تاپ" width="800" height="533"/></div>
            <div className="login-capabilities">{[[ShoppingBag,'مدیریت سفارش‌ها'],[Box,'محصولات و موجودی'],[Users,'ارتباط با مشتریان']].map(([Icon,label]:any)=><div key={label}><Icon size={25}/><span>{label}</span></div>)}</div>
          </div>
        </section>
        <section className="login-form-wrap"><form className="login-glass-form" onSubmit={login} aria-label="ورود مدیران">
          <div className="login-lock" aria-hidden="true"><LockKeyhole size={28}/></div>
          <h2>ورود مدیران</h2><p className="login-intro">به پنل مدیریت کسب‌وکار خود خوش آمدید.</p>
          <label htmlFor="admin-email">ایمیل</label><input id="admin-email" aria-label="ایمیل" type="email" autoComplete="username" placeholder="ایمیل خود را وارد کنید" value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy} maxLength={254}/>
          <label htmlFor="admin-password">رمز عبور</label><div className="login-password"><input id="admin-password" aria-label="رمز عبور" type={visible?'text':'password'} autoComplete="current-password" placeholder="رمز عبور خود را وارد کنید" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={128} disabled={busy}/>
            <button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?'پنهان کردن رمز':'نمایش رمز'} aria-pressed={visible}>{visible?<EyeOff size={21}/>:<Eye size={21}/>}</button></div>
          {error&&<p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" disabled={busy}>{busy?'در حال ورود…':'ورود به مرکز مدیریت'}<ArrowRight size={21}/></button>
          <p className="login-note">دسترسی هر بخش با مجوز حساب شما تعیین می‌شود.</p>
        </form><div className="login-connection"><button type="button" onClick={()=>setConnection(v=>!v)}>اطلاعات اتصال</button><button type="button" disabled={checking} onClick={async()=>{setChecking(true);setHealth('');try{const result=await api('/health');setHealth(result.status==='ok'?'بک‌اند پاسخ می‌دهد؛ اعتبار حساب جداگانه بررسی می‌شود.':'پاسخ سلامت نامعتبر است.');}catch(e){setHealth(e instanceof Error?e.message:'خطای اتصال');}finally{setChecking(false);}}}>{checking?'در حال بررسی…':'بررسی اتصال'}</button></div>
        {(connection||health)&&<div className="login-connection-info">{connection&&<p dir="ltr">{location.origin}/api</p>}{health&&<p role="status">{health}</p>}</div>}
        </section>
      </div>
      <section className="login-benefits" aria-label="امکانات پنل">{[[Monitor,'قابل استفاده در همه دستگاه‌ها'],[Zap,'مدیریت یکپارچهٔ فروشگاه'],[ShieldCheck,'دسترسی امن بر اساس نقش']].map(([Icon,label]:any)=><div key={label}><span>{label}</span><Icon size={23}/></div>)}</section>
    </div>
  </main>;
}
