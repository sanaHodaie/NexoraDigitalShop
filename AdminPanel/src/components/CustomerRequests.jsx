import React, {useEffect, useState} from 'react';
import Select from './Select';
import ApprovalForm from './WholesaleApprovalForm';
import {TelegramInvoiceContent} from './TelegramInvoice';
import {api, write} from '../api';
import {Button, Panel, Heading, ErrorBox, Field, Empty, Modal, LoadState, useResource, date, number, inputClass} from './ManagementUI';
const statuses={new:'جدید',reviewing:'در حال بررسی',contacted:'تماس گرفته شد',quoted:'پیشنهاد قیمت ارائه شد',closed:'بسته شد',cancelled:'لغو شد',approved:'تأیید شده'};
const labels={name:'نام مشتری',phone:'شماره تماس',company:'شرکت / فروشگاه',items:'کالاها / موضوع درخواست',quantity:'تعداد کل',city:'شهر',address:'نشانی مقصد',notes:'توضیحات مشتری'};
function RequestCard({item, canEdit, canApprove, onSaved, onReload}) {
 const [status,setStatus]=useState(item.status),[note,setNote]=useState(item.staffNote||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setStatus(item.status);setNote(item.staffNote||'');},[item]);
 const save=async()=>{setBusy(true);setError('');try{onSaved(await write('/admin/customer-requests/'+item.id,'PATCH',{status,staffNote:note,version:item.version}));}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <div className="space-y-5"><header className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{item.kind==='wholesale'?'درخواست عمده':'پشتیبانی'} #{item.id}</h2><p className="text-xs text-slate-500 mt-2">تلگرام · {date(item.createdAt)}</p></div><span className="text-xs text-blue-600">{statuses[item.status]}</span></header>
 {!item.hasInvoice&&<dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">{Object.entries(labels).map(([key,label])=><div key={key} className={['items','address','notes'].includes(key)?'sm:col-span-2':''}><dt className="text-xs text-slate-500 mb-1">{label}</dt><dd className="whitespace-pre-wrap break-words" dir={key==='phone'?'ltr':undefined}>{item.details[key]||'ثبت نشده'}</dd></div>)}</dl>}
 <div className="text-xs text-slate-500 break-all">شناسه تلگرام: <b dir="ltr">{item.telegramUserId}</b>{item.telegramUsername&&<span dir="ltr"> · @{item.telegramUsername}</span>}</div>
 {!item.hasInvoice&&<div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="وضعیت رسیدگی"><Select aria-label={"وضعیت رسیدگی درخواست "+item.id} className={inputClass} value={status} disabled={!canEdit||busy||item.hasInvoice} onChange={e=>setStatus(e.target.value)}>{Object.entries(statuses).filter(([value])=>value!=='approved'||item.hasInvoice).map(([value,label])=><option value={value} key={value}>{label}</option>)}</Select></Field><Field label="یادداشت داخلی تیم (برای مشتری نمایش داده نمی‌شود)"><textarea className={inputClass} value={note} maxLength={2000} disabled={!canEdit||busy||item.hasInvoice} onChange={e=>setNote(e.target.value)}/></Field></div>}
 <div className="flex flex-wrap gap-3 items-center">{item.trackingCode&&<strong className="text-blue-600" dir="ltr">کد رهگیری: {item.trackingCode}</strong>}{item.approvedAt||item.hasInvoice?<span className="text-xs">ارسال تلگرام: {{sent:'ارسال شد',pending:'در صف ارسال',failed:'ناموفق؛ نیاز به تلاش مجدد'}[item.deliveryStatus]||'در صف'}</span>:null}{canApprove&&item.deliveryStatus==='failed'&&<Button secondary onClick={async()=>{try{await write('/admin/customer-requests/'+item.id+'/retry-delivery','POST');onReload();}catch(e){setError(e.message);}}}>تلاش مجدد ارسال</Button>}</div>
 {canApprove&&item.kind==='wholesale'&&!item.hasInvoice&&!['cancelled','closed'].includes(item.status)&&<ApprovalForm key={`${item.id}:${item.version}`} item={item} onSaved={onSaved}/>}
 {item.hasInvoice&&<><TelegramInvoiceContent item={item} onRefresh={onReload}/><details className="rounded-2xl border border-blue-100 dark:border-slate-700 p-4"><summary className="cursor-pointer text-sm font-bold">درخواست اولیه و یادداشت داخلی</summary><dl className="grid sm:grid-cols-2 gap-4 mt-4">{Object.entries(labels).map(([key,label])=><div key={key}><dt className="text-xs text-slate-500">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words">{item.details[key]||'ثبت نشده'}</dd></div>)}</dl><p className="text-xs mt-4 whitespace-pre-wrap">یادداشت داخلی: {item.staffNote||'ثبت نشده'}</p></details></>}
 <ErrorBox message={error}/>{canEdit&&!item.hasInvoice&&<Button disabled={busy} onClick={save}>{busy?'در حال ذخیره…':'ذخیرهٔ رسیدگی'}</Button>}</div>;
}
function RequestDetail({id,can,onClose,onChanged}) {
 const resource=useResource('/admin/customer-requests/'+id);
 const refresh=()=>{resource.reload();onChanged();};
 return <Modal title={`جزئیات سفارش تلگرام ${id}`} onClose={onClose}><LoadState {...resource}/>{resource.data&&<RequestCard item={resource.data} canEdit={can('orders:cancel')} canApprove={can('orders:confirm_payment')} onReload={refresh} onSaved={refresh}/>}</Modal>;
}
export default function CustomerRequests({can}) {
 const [data,setData]=useState(null),[page,setPage]=useState(1),[size,setSize]=useState(50),[selected,setSelected]=useState(null);
 const [kind,setKind]=useState(''),[status,setStatus]=useState(''),[text,setText]=useState(''),[search,setSearch]=useState('');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const refresh=()=>setRevision(n=>n+1);
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');const query=new URLSearchParams({page:String(page),size:String(size),q:search,...(kind?{kind}:{}),...(status?{status}:{})});
  api('/admin/customer-requests?'+query,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setData(result);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[page,size,search,kind,status,revision]);
 return <div className="space-y-5"><Heading title="درخواست‌های عمده و پشتیبانی تلگرام" subtitle="خلاصهٔ درخواست‌ها در یک نگاه؛ برای مشاهدهٔ اقلام کامل، نشانی، رسیدگی و فاکتور روی «جزئیات سفارش» بزنید."><Button secondary onClick={refresh}>تازه‌سازی درخواست‌ها</Button></Heading>
  <Panel className="space-y-4"><form className="flex flex-wrap gap-3" onSubmit={e=>{e.preventDefault();setSearch(text.trim());setPage(1);}}><input aria-label="جستجوی درخواست تلگرام" maxLength={100} className={`${inputClass} flex-1 min-w-40`} placeholder="نام مشتری، تلفن، کالا، شماره درخواست یا کد رهگیری…" value={text} onChange={e=>setText(e.target.value)}/><Button secondary>جست‌وجو</Button></form>
   <div className="grid sm:grid-cols-3 gap-3"><Field label="نوع درخواست"><Select aria-label="نوع درخواست" className={inputClass} value={kind} onChange={e=>{setKind(e.target.value);setPage(1);}}><option value="">همه</option><option value="wholesale">خرید عمده</option><option value="support">پشتیبانی</option></Select></Field>
   <Field label="فیلتر وضعیت"><Select aria-label="فیلتر وضعیت" className={inputClass} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">همه</option>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select></Field>
   <Field label="تعداد ردیف در صفحه"><Select aria-label="تعداد درخواست در صفحه" className={inputClass} value={String(size)} onChange={e=>{setSize(Number(e.target.value));setPage(1);}}>{[20,50,100].map(n=><option key={n} value={String(n)}>{number(n)} درخواست</option>)}</Select></Field></div>
  </Panel><ErrorBox message={error}/>{loading?<p role="status">در حال دریافت درخواست‌ها…</p>:!error&&<section aria-label="فهرست خلاصه درخواست‌ها" className="space-y-2">
   <p className="text-xs text-slate-500">{number(data?.total||0)} درخواست · صفحهٔ {number(page)} از {number(Math.max(1,Math.ceil((data?.total||0)/size)))}</p>
   {data?.items?.length?data.items.map(item=><article key={item.id} className="glass-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold max-w-full break-words">{item.kind==='wholesale'?'خرید عمده':'پشتیبانی'} #{number(item.id)} · {item.details.name}</h2><span className="text-[11px] rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-1 text-blue-700 dark:text-blue-200">{statuses[item.status]}</span></div>
     <p className="text-xs text-slate-500 mt-1.5 truncate max-w-full" title={item.details.items}>{item.details.items}</p><p className="text-[11px] text-slate-500 mt-1">{item.details.city} · {date(item.createdAt)}{item.trackingCode&&<> · کد رهگیری: <b dir="ltr">{item.trackingCode}</b></>}</p>
    </div><Button secondary aria-label={`جزئیات سفارش ${item.id}`} onClick={()=>setSelected(item.id)}>جزئیات سفارش</Button>
   </article>):<Empty>درخواستی با این فیلتر ثبت نشده است.</Empty>}
  </section>}
  <div className="flex flex-wrap justify-center gap-3 items-center"><Button secondary disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)}>قبلی</Button><span className="text-xs">صفحه {number(page)} · {number(data?.total||0)} درخواست</span><Button secondary disabled={loading||!data||page*size>=data.total} onClick={()=>setPage(p=>p+1)}>بعدی</Button></div>
  {selected!==null&&<RequestDetail id={selected} can={can} onClose={()=>setSelected(null)} onChanged={refresh}/>}
 </div>;
}
