import React, {useEffect, useRef} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {ArrowLeft, Send, Truck, PackageX, RotateCcw, ShieldCheck, Headphones, ClipboardList, Mail, Phone, ChevronDown} from 'lucide-react';
import {useContent} from '../context/ContentContext';
import EditorialMeta from '../components/Articles/EditorialMeta';
import {SUPPORT_TOPICS, SUPPORT_FAQ, TELEGRAM_SHOP_BOT} from '../data/support';
import './support.css';
const icons={shipping:Truck,damage:PackageX,returns:RotateCcw,warranty:ShieldCheck};

function SupportQuestion({item}) {
 const ref=useRef(null), animation=useRef(null), expanded=useRef(false);
 useEffect(()=>()=>animation.current?.cancel(),[]);
 const toggle=event=>{
  event.preventDefault();
  const el=ref.current;
  expanded.current=!expanded.current;
  const start=el.getBoundingClientRect().height;
  animation.current?.cancel();
  el.open=true;
  const style=window.getComputedStyle(el);
  const collapsed=el.querySelector('summary').getBoundingClientRect().height+['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+parseFloat(style[key]),0);
  const end=expanded.current?el.getBoundingClientRect().height:collapsed;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!el.animate){el.open=expanded.current;return;}
  animation.current=el.animate([{height:start+'px'},{height:end+'px'}],{duration:300,easing:'cubic-bezier(.22,1,.36,1)'});
  animation.current.onfinish=()=>{el.open=expanded.current;animation.current=null;};
 };
 return <details ref={ref}><summary onClick={toggle}>{item.question}<ChevronDown size={17}/></summary><p>{item.answer}</p></details>;
}

export default function SupportPage() {
 const {settings}=useContent();const {hash}=useLocation();
 const page=useRef(null);
 useEffect(()=>{
  if(!window.IntersectionObserver)return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.add('support-visible');observer.unobserve(entry.target);}
  }),{threshold:0.08});
  page.current.querySelectorAll('.support-card,.support-wholesale,.support-faq details').forEach((el,index)=>{
   el.classList.add('support-reveal');el.style.setProperty('--support-delay',((index%2)*65)+'ms');observer.observe(el);
  });
  return ()=>observer.disconnect();
 },[]);
 useEffect(()=>{if(hash)document.getElementById(hash.slice(1))?.scrollIntoView({block:'start'});},[hash]);
 const email=settings.supportEmail,phone=settings.supportPhone;
 const dial=phone?.replace(/[۰-۹٠-٩]/g,c=>String(c.charCodeAt(0)-(c>='۰'&&c<='۹'?1776:1632))).replace(/[^\d+]/g,'');
 return <div ref={page} className="support-page" dir="rtl">
  <EditorialMeta title="پشتیبانی و راهنمای خرید" description="راهنمای ارسال، آسیب‌دیدگی کالا، بازگرداندن، گارانتی و پیگیری سفارش نکسورا؛ استعلام خرید عمده از بات تلگرام." path="/support" siteName="نکسورا" pageType="WebPage" image="/assets/hero_devices_showcase_1790527984816.webp"/>
  <nav className="support-crumb" aria-label="مسیر صفحه"><Link to="/">فروشگاه نکسورا</Link><span>/</span><span>پشتیبانی</span></nav>
  <header className="support-hero"><div className="support-hero-icon"><Headphones size={29}/></div><p>مرکز راهنمایی نکسورا</p><h1>کنار شماییم؛ از انتخاب تا تحویل.</h1><p>راهنمای سفارش، ارسال و خدمات پس از خرید را اینجا بخوانید. برای استعلام خرید عمده هم می‌توانید درخواستتان را در بات تلگرام ثبت کنید.</p>
   <div className="support-hero-actions"><a href="#contact">ارتباط با پشتیبانی<ArrowLeft size={17}/></a><a href={TELEGRAM_SHOP_BOT} target="_blank" rel="noopener noreferrer"><Send size={17}/>خرید عمده در تلگرام</a></div>
  </header>
  <nav className="support-topics" aria-label="موضوعات پشتیبانی">{[...SUPPORT_TOPICS.map(x=>[x.id,x.title]),['tracking','پیگیری سفارش'],['wholesale','خرید عمده'],['faq','سؤالات متداول'],['contact','ارتباط با پشتیبانی']].map(([id,title])=><Link key={id} to={'/support#'+id}>{title}</Link>)}</nav>
  <div className="support-policy-grid">{SUPPORT_TOPICS.map(topic=>{const Icon=icons[topic.icon];return <section id={topic.id} key={topic.id} className="support-card"><span className="support-topic-icon"><Icon size={23}/></span><h2>{topic.title}</h2><p>{topic.intro}</p><ul>{topic.points.map(point=><li key={point}>{point}</li>)}</ul></section>;})}</div>
  <section id="tracking" className="support-card support-tracking"><span className="support-topic-icon"><ClipboardList size={23}/></span><h2>سفارشتان در چه مرحله‌ای است؟</h2><p>برای خریدهای سایت، از حساب کاربری وارد بخش سفارش‌ها شوید و وضعیت و فاکتور را ببینید. هنگام تماس با پشتیبانی، شماره سفارش و نام کالا را آماده داشته باشید.</p><p>درخواست‌های عمدهٔ تلگرام با شمارهٔ درخواست و سپس کد رهگیری فاکتور پیگیری می‌شوند؛ در همان بات، «پیگیری درخواست‌ها» را انتخاب کنید.</p><Link className="support-primary" to="/account">مشاهدهٔ حساب و سفارش‌ها<ArrowLeft size={16}/></Link></section>
  <section id="wholesale" className="support-wholesale"><div><p className="support-eyebrow">برای فروشگاه‌ها و خریدهای تعداد بالا</p><h2>استعلام عمده، مستقیم در بات نکسورا</h2><p>مدل کالا، تعداد موردنیاز، اطلاعات تماس و نشانی را در بات ثبت کنید. تیم فروش درخواست را بررسی می‌کند و قیمت توافقی و شرایط ارسال را اعلام می‌کند.</p><ol><li>بات را باز کنید و <bdi>/start</bdi> را بزنید.</li><li>از منوی شروع، «درخواست خرید عمده» را انتخاب و فرم را کامل کنید.</li><li>شمارهٔ درخواست را نگه دارید؛ پس از تأیید تیم فروش، کد رهگیری و فاکتور در بات قابل دریافت است.</li></ol><p className="support-wholesale-note">ثبت فرم، خرید قطعی یا پرداخت نیست؛ قیمت و شرایط پس از بررسی تأیید می‌شوند.</p></div><div className="support-bot-card"><Send size={38}/><b dir="ltr">@NexoraShopHelperBot</b><span>ثبت و پیگیری درخواست عمده</span><a href={TELEGRAM_SHOP_BOT} target="_blank" rel="noopener noreferrer">باز کردن بات تلگرام<ArrowLeft size={17}/></a></div></section>
  <section id="faq" className="support-faq"><h2>سؤالات متداول</h2>{SUPPORT_FAQ.map(item=><SupportQuestion key={item.question} item={item}/>)}</section>
  <section id="contact" className="support-card"><span className="support-topic-icon"><Headphones size={23}/></span><h2>ارتباط با پشتیبانی</h2><p>برای پیگیری ارسال، گزارش آسیب یا راهنمایی دربارهٔ گارانتی، موضوع و شماره سفارش را همراه نام کالا اعلام کنید تا درخواست به بخش مربوط برسد.</p><div className="support-contact-links">{email&&<a href={'mailto:'+email}><Mail size={18}/><span dir="ltr">{email}</span></a>}{phone&&dial&&<a href={'tel:'+dial}><Phone size={18}/><span dir="ltr">{phone}</span></a>}<a href={TELEGRAM_SHOP_BOT} target="_blank" rel="noopener noreferrer"><Send size={18}/>درخواست پشتیبانی در بات</a></div></section>
 </div>;
}
