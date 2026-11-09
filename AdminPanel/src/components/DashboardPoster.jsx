import React from 'react';
import {ArrowLeft} from 'lucide-react';
export default function DashboardPoster({name,onOpen}) {
 return <section className="dashboard-poster" aria-label="خوشامد داشبورد"><div className="dashboard-poster-copy">
  <p>👋 {name?`سلام ${name}؛ به نکسورا خوش آمدید`:'به نکسورا خوش آمدید'}</p><h2>هر درخواست، شروع یک ارتباط پایدار!</h2>
  <p>مدیریت سفارش‌ها، محصولات و مشتریان در یک سامانهٔ یکپارچه، سریع و امن.</p>
  {onOpen&&<button onClick={onOpen}>بررسی درخواست‌ها<ArrowLeft size={16}/></button>}
 </div><img src="/assets/admin/dashboard-poster.webp" alt="" width="760" height="507"/></section>;
}
