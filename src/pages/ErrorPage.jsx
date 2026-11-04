import React, {useEffect} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft, Home, RefreshCw, MessageCircle} from 'lucide-react';
import './error-page.css';
export default function ErrorPage({kind='not-found', onRetry}) {
 const unavailable=kind==='unavailable';
 useEffect(()=>{const title=document.title;const robots=document.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';document.head.appendChild(robots);document.title=unavailable?'کمی مکث، دوباره در مسیر | نکسورا':'مسیر پیدا نشد | نکسورا';return()=>{document.title=title;robots.remove();};},[unavailable]);
 return <section className="nexora-error" dir="rtl" aria-labelledby="error-title"><div className="error-orbit" aria-hidden="true"/>
 <div className="error-eyebrow"><span/>NEXORA · همراه انتخاب‌های شما</div>
 <div className="error-illustration"><span className="error-code" aria-hidden="true">{unavailable?'!':'404'}</span><img src="/assets/error-navigation.webp" alt="قطب‌نمای نکسورا برای پیدا کردن دوبارهٔ مسیر" width="640" height="640" decoding="async" fetchPriority="high"/></div>
 <div className="error-copy"><p className="error-label">{unavailable?'یک مکث کوتاه در مسیر':'صفحه پیدا نشد · ۴۰۴'}</p><h1 id="error-title">{unavailable?'کمی مکث؛ دوباره وصل می‌شویم.':'این مسیر به جایی نرسید؛'}{!unavailable&&<span>انتخاب‌های خوب هنوز منتظر تو هستند.</span>}</h1>
 <p className="error-description">{unavailable?'این بخش فعلاً پاسخ نمی‌دهد. کمی بعد دوباره امتحان کن؛ می‌توانی از صفحهٔ اصلی مسیرت را ادامه بدهی.':'ممکن است آدرس تغییر کرده باشد یا صفحه دیگر اینجا نباشد. از خانه شروع کنیم و مسیر تازه‌ای پیدا کنیم.'}</p>
 <div className="error-actions"><Link className="error-primary" to="/"><Home size={18}/>بازگشت به خانه<ArrowLeft size={17}/></Link>{unavailable?<button className="error-secondary" onClick={()=>onRetry?onRetry():window.location.reload()}><RefreshCw size={17}/>تلاش دوباره</button>:<Link className="error-secondary" to="/category/smartphones">گشت‌وگذار در فروشگاه<ArrowLeft size={17}/></Link>}</div>
 <a className="error-support" href="https://t.me/NexoraShopHelperBot" target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/>به راهنمایی نیاز داری؟ با ما در ارتباط باش</a></div></section>;
}
