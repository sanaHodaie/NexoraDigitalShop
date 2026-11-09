import React from 'react';
import {Modal,LoadState,useResource,date,Button} from './ManagementUI';
const rial=value=>new Intl.NumberFormat('fa-IR').format(BigInt(value||0))+' ریال';
export default function TelegramInvoice({id,onClose}) {
 const resource=useResource('/admin/customer-requests/'+id),item=resource.data,invoice=item?.invoice;
 return <Modal title={`فاکتور عمدهٔ تلگرام ${id}`} onClose={onClose}><LoadState {...resource}/>{item&&<div className="space-y-5">
  <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 p-4 space-y-2"><p className="font-bold">{item.details.name}</p><p>کد رهگیری: <b dir="ltr">{item.trackingCode}</b></p><p className="text-xs">{date(invoice?.approvedAt)} · تأیید سفارش به‌معنی تأیید پرداخت نیست.</p></div>
  <dl className="grid sm:grid-cols-2 gap-4">{Object.entries({phone:'تلفن',company:'شرکت / فروشگاه',city:'شهر',address:'نشانی',notes:'توضیحات مشتری'}).map(([key,label])=><div key={key}><dt className="text-xs text-slate-500">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words">{item.details[key]||'—'}</dd></div>)}</dl>
  {invoice&&<><div className="space-y-3">{invoice.lines.map((line,i)=><div key={i} className="rounded-2xl border border-blue-100 dark:border-slate-700 p-3"><strong className="text-sm">{line.name}</strong><p className="text-xs mt-2">{new Intl.NumberFormat('fa-IR').format(line.quantity)} عدد × {rial(line.unitPriceRial)} · جمع: {rial(line.totalRial)}</p></div>)}</div><p>هزینه ارسال: {rial(invoice.shippingRial)}</p><p className="font-bold">مبلغ کل: {rial(invoice.totalRial)}</p>{invoice.terms&&<p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>}</>}
  <p className="text-xs">ارسال تلگرام: {{sent:'ارسال شده',pending:'در صف ارسال',failed:'ناموفق',none:'ثبت نشده'}[item.deliveryStatus]||'در صف ارسال'}</p>
  <a className="inline-flex rounded-2xl px-5 py-3 bg-blue-600 text-white text-sm font-bold" href={`/api/admin/customer-requests/${id}/invoice`} download>دانلود فاکتور PDF</a>
  <p className="text-xs text-slate-500">این همان فایل ذخیره‌شده‌ای است که برای مشتری در تلگرام ارسال می‌شود.</p><Button secondary onClick={resource.reload}>تازه‌سازی جزئیات</Button>
 </div>}</Modal>;
}
