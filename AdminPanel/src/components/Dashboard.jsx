import React from 'react';
import DashboardPoster from './DashboardPoster';
import CustomerRequestStats from './CustomerRequestStats';
import {Package,Users,ShoppingBag,Wallet,ArrowLeft} from 'lucide-react';
import {Heading,Panel,Button,LoadState,useResource,money,number} from './ManagementUI';
import {STATUS_LABELS} from './Orders';
import {AnimatedAreaChart} from './AnimatedChart';


export default function Dashboard({onNavigate,name,can=(_permission)=>false}) {
 const resource=useResource('/admin/dashboard'),d=resource.data;
 return <div className="space-y-6">
  <Heading title="داشبورد مدیریت نکسورا" subtitle="خلاصهٔ واقعی فروشگاه؛ قیمت‌ها مطابق سایت به ریال نمایش داده می‌شوند."><Button secondary onClick={resource.reload}>به‌روزرسانی آمار</Button></Heading>
  <DashboardPoster name={name} onOpen={can('orders:read')?()=>onNavigate('customer-requests'):undefined}/>
  <LoadState {...resource}/>
  {d&&<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{[[Wallet,'فروش پرداخت‌شده',money(d.revenue)],[ShoppingBag,'سفارش‌ها',number(d.orders)],[Users,'حساب‌های کاربران',number(d.users)],[Package,'محصولات',number(d.products)]].map(([Icon,title,value])=><Panel key={title} className="space-y-4"><span className="inline-flex rounded-2xl p-3 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300"><Icon size={22}/></span><p className="text-xs text-slate-500">{title}</p><strong className="text-xl sm:text-2xl font-black break-words">{value}</strong></Panel>)}</div>}
  {can('orders:read')&&<CustomerRequestStats onNavigate={onNavigate}/>}
  <div className="grid xl:grid-cols-3 gap-5">
   <Panel className="xl:col-span-2"><h2 className="font-bold mb-3">فروش واقعی ۳۰ روز اخیر</h2><p className="text-xs text-slate-500 mb-6">مبالغ سفارش‌های پرداخت‌شده، به ریال</p>{d&&<><AnimatedAreaChart data={d.daily.map(x=>({day:x.date,revenue:x.value}))} unit="ریال" title="فروش واقعی"/><details className="mt-5 text-xs"><summary>مشاهدهٔ داده‌های نمودار</summary>{d.daily.map(x=><p key={x.date}>{x.date}: {money(x.value)}</p>)}</details></>}</Panel>
   <Panel><h2 className="font-bold mb-6">وضعیت واقعی سفارش‌ها</h2>{d&&Object.entries(STATUS_LABELS).map(([key,label])=><div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800 text-sm" key={key}><span>{label}</span><strong>{number(d.statuses[key])}</strong></div>)}</Panel>
  </div>
  {d&&<div className="grid sm:grid-cols-2 gap-5"><Panel><h2 className="font-bold">رادار عملیاتی · پیگیری موجودی</h2><p className="text-sm my-4">{number(d.lowStock)} محصول فعال کمتر از ۵ عدد موجودی دارد.</p>{can('products:read')&&<Button secondary onClick={()=>onNavigate('products')}>مدیریت محصولات <ArrowLeft size={14} className="inline"/></Button>}</Panel><Panel><h2 className="font-bold">ارتباط با مشتریان</h2><p className="text-sm my-4">{number(d.subscribers)} عضو خبرنامه ثبت شده است.</p>{can('subscribers:read')&&<Button secondary onClick={()=>onNavigate('messages')}>مشاهده اعضای خبرنامه</Button>}</Panel></div>}
 </div>;
}
