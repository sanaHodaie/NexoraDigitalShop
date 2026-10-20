import React from 'react';
import {Truck} from 'lucide-react';
import {Modal,money,date,number} from './ManagementUI';
import {STATUS_LABELS} from './Orders';
import {toRial} from '../../../src/lib/money';
export default function InvoiceModal({order:o,onClose}) {
 const subtotal=o.lines.reduce((sum,l)=>sum+l.quantity*l.unitPrice,0);
 const shipping=o.total-subtotal,free=toRial(shipping)===0;
 return <Modal title={`جزئیات سفارش ${o.id}`} onClose={onClose}><div className="space-y-5">
  <h2 className="font-black text-xl">فروشگاه نکسورا</h2><p className="text-sm">{o.name} · <span dir="ltr">{o.email}</span></p><p className="text-xs">{date(o.createdAt)} · {STATUS_LABELS[o.status]}</p>
  {o.lines.map(l=><div key={l.productId} className="flex flex-wrap justify-between gap-3 py-3 border-b border-slate-200 dark:border-slate-700"><div><h3 className="text-sm font-bold">{l.name}</h3><span className="text-xs text-slate-500">تعداد {number(l.quantity)} × {money(l.unitPrice)}</span></div><strong>{money(l.quantity*l.unitPrice)}</strong></div>)}
  <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/30 p-4 space-y-4 text-sm"><p className="flex flex-wrap justify-between gap-2"><span>جمع کالاها</span><strong>{money(subtotal)}</strong></p><p className="flex flex-wrap justify-between gap-2"><span>هزینهٔ ارسال</span><strong className={free?'text-emerald-600 dark:text-emerald-400':''}>{free?'رایگان':money(shipping)}</strong></p><p className="flex flex-wrap justify-between gap-2 font-black border-t border-purple-200 dark:border-purple-800 pt-4"><span>مبلغ کل سفارش</span><span>{money(o.total)}</span></p></div>
  {free&&<div className="flex items-start gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-4 text-emerald-800 dark:text-emerald-300"><Truck size={23} className="shrink-0"/><div><p className="text-sm font-bold">ارسال رایگان برای این سفارش ثبت شده است</p><p className="text-xs mt-2 leading-6">{subtotal>=99?`مبلغ کالاها به حد نصاب ${money(99)} رسیده؛ هزینه‌ای بابت ارسال دریافت نمی‌شود.`:'هزینهٔ ارسال این سفارش صفر ثبت شده است.'}</p></div></div>}
  <p className="text-xs text-slate-500 leading-6">قیمت اقلام مربوط به زمان ثبت سفارش است. این صفحه جزئیات سفارش فروشگاه است و فاکتور رسمی مالیاتی محسوب نمی‌شود.</p>
 </div></Modal>;
}
