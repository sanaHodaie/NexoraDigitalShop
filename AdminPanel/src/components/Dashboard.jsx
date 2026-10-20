import React from 'react';
import {Package,Users,ShoppingBag,Wallet,ArrowLeft} from 'lucide-react';
import {Heading,Panel,Button,LoadState,useResource,money,number} from './ManagementUI';
import {STATUS_LABELS} from './Orders';
import {AnimatedAreaChart} from './AnimatedChart';
const illustration=[18,30,24,48,39,60,53,76,68,87,79,96].map((value,i)=>({day:number(i+1),revenue:value}));

export default function Dashboard({onNavigate}) {
 const resource=useResource('/admin/dashboard'),d=resource.data;
 return <div className="space-y-6">
  <Heading title="داشبورد مدیریت نکسورا" subtitle="خلاصهٔ واقعی فروشگاه؛ قیمت‌ها مطابق سایت به ریال نمایش داده می‌شوند."><Button secondary onClick={resource.reload}>به‌روزرسانی آمار</Button></Heading>
  <LoadState {...resource}/>
  {d&&<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{[[Wallet,'فروش پرداخت‌شده',money(d.revenue)],[ShoppingBag,'سفارش‌ها',number(d.orders)],[Users,'حساب‌های کاربران',number(d.users)],[Package,'محصولات',number(d.products)]].map(([Icon,title,value])=><Panel key={title} className="space-y-4"><span className="inline-flex rounded-2xl p-3 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300"><Icon size={22}/></span><p className="text-xs text-slate-500">{title}</p><strong className="text-xl sm:text-2xl font-black break-words">{value}</strong></Panel>)}</div>}
  <div className="grid xl:grid-cols-3 gap-5">
   <Panel className="xl:col-span-2"><div className="flex flex-wrap items-center justify-between gap-3 mb-3"><h2 className="font-bold">نمایی از مسیر رشد</h2><span className="rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-200 px-3 py-1 text-xs">نمودار نمادین</span></div><p className="text-xs text-slate-500 mb-6 leading-6">این نمودار برای نمایش بصری است و آمار واقعی فروش نیست.</p><AnimatedAreaChart data={illustration} unit="امتیاز نمایشی" title="نمودار نمادین رشد"/>
    {d&&<details className="mt-5 text-xs"><summary className="cursor-pointer py-2 text-purple-700 dark:text-purple-300">مشاهدهٔ فروش واقعی ۳۰ روز اخیر</summary><div className="mt-3 grid sm:grid-cols-2 gap-3">{d.daily.map(x=><p key={x.date}>{x.date}: {money(x.value)}</p>)}</div></details>}
   </Panel>
   <Panel><h2 className="font-bold mb-6">وضعیت واقعی سفارش‌ها</h2>{d&&Object.entries(STATUS_LABELS).map(([key,label])=><div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800 text-sm" key={key}><span>{label}</span><strong>{number(d.statuses[key])}</strong></div>)}</Panel>
  </div>
  {d&&<div className="grid sm:grid-cols-2 gap-5"><Panel><h2 className="font-bold">پیگیری موجودی</h2><p className="text-sm my-4">{number(d.lowStock)} محصول فعال کمتر از ۵ عدد موجودی دارد.</p><Button secondary onClick={()=>onNavigate('products')}>مدیریت محصولات <ArrowLeft size={14} className="inline"/></Button></Panel><Panel><h2 className="font-bold">ارتباط با مشتریان</h2><p className="text-sm my-4">{number(d.subscribers)} عضو خبرنامه ثبت شده است.</p><Button secondary onClick={()=>onNavigate('messages')}>مشاهده اعضای خبرنامه</Button></Panel></div>}
 </div>;
}
