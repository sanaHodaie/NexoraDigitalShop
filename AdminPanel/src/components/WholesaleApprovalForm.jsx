import React,{useState,useRef} from 'react';
import {write} from '../api';
import {approvalData,totalRial} from '../approval';
import {Button,Field,ErrorBox,inputClass} from './ManagementUI';
const rial=value=>new Intl.NumberFormat('fa-IR').format(BigInt(value))+' ریال';
export default function WholesaleApprovalForm({item,onSaved}) {
 const [open,setOpen]=useState(false),[lines,setLines]=useState([{name:item.details.items,quantity:String(item.details.quantity),unitPriceRial:''}]);
 const [shipping,setShipping]=useState('0'),[terms,setTerms]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState(null);
 const inFlight=useRef(false);
 const change=(index,key,value)=>{setPreview(null);setLines(rows=>rows.map((r,i)=>i===index?{...r,[key]:value}:r));};
 const review=e=>{e.preventDefault();setError('');try{setPreview(approvalData({lines,shippingRial:shipping,terms}));}catch(e){setError(e.message);}};
 const submit=async()=>{if(!preview||inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
  try{const result=await write('/admin/customer-requests/'+item.id+'/approve','POST',{version:item.version,...preview});onSaved(result);setOpen(false);}
  catch(e){setError(e.message);}finally{inFlight.current=false;setBusy(false);}
 };
 if(!open)return <Button onClick={()=>setOpen(true)}>بررسی و صدور فاکتور عمده</Button>;
 if(preview)return <section className="rounded-2xl border border-blue-200 dark:border-blue-900 p-4 space-y-4"><h3 className="font-bold">بازبینی نهایی فاکتور</h3><p>{item.details.name} · {item.details.phone}</p><p className="whitespace-pre-wrap">{item.details.city} · {item.details.address}</p>{preview.lines.map((line,i)=><p key={i}>{line.name} · {new Intl.NumberFormat('fa-IR').format(line.quantity)} عدد × {rial(line.unitPriceRial)} = {rial(BigInt(line.quantity)*BigInt(line.unitPriceRial))}</p>)}<p>ارسال: {rial(preview.shippingRial)}</p><p className="font-bold">جمع: {rial(totalRial(preview))}</p><p className="whitespace-pre-wrap">{preview.terms}</p><p className="text-xs leading-6">پس از تأیید، کد رهگیری و PDF ثابت صادر و همان فایل برای مشتری در صف ارسال تلگرام قرار می‌گیرد. این عملیات تأیید پرداخت نیست.</p><ErrorBox message={error}/><div className="flex gap-3"><Button disabled={busy} onClick={submit}>{busy?'در حال تأیید…':'تأیید نهایی و ارسال فاکتور در تلگرام'}</Button><Button secondary disabled={busy} onClick={()=>setPreview(null)}>اصلاح فاکتور</Button></div></section>;
 return <form className="rounded-2xl border border-purple-200 dark:border-purple-800 p-4 space-y-4" onSubmit={review}>
  <h3 className="font-bold">تأیید سفارش و صدور فاکتور PDF</h3><p className="text-xs leading-6 text-slate-500">اطلاعات مشتری خودکار درج می‌شود؛ اقلام و قیمت توافقی را وارد و پیش از ارسال بازبینی کنید.</p>
  {lines.map((line,index)=><div className="grid sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3" key={index}>
   <Field label={'شرح قلم '+(index+1)}><input aria-label={'شرح قلم '+(index+1)} className={inputClass} value={line.name} required maxLength={300} onChange={e=>change(index,'name',e.target.value)}/></Field>
   <Field label="تعداد"><input aria-label={'تعداد قلم '+(index+1)} className={inputClass} inputMode="numeric" required value={line.quantity} onChange={e=>change(index,'quantity',e.target.value)}/></Field>
   <Field label="قیمت واحد (ریال)"><input aria-label={'قیمت واحد قلم '+(index+1)} className={inputClass} inputMode="numeric" required value={line.unitPriceRial} onChange={e=>change(index,'unitPriceRial',e.target.value)}/></Field>
   {lines.length>1&&<Button secondary type="button" onClick={()=>setLines(rows=>rows.filter((_,i)=>i!==index))}>حذف قلم</Button>}
  </div>)}
  <Button secondary type="button" disabled={lines.length>=50} onClick={()=>setLines(rows=>[...rows,{name:'',quantity:'1',unitPriceRial:''}])}>افزودن قلم</Button>
  <Field label="هزینه ارسال توافقی (ریال)"><input aria-label="هزینه ارسال توافقی" className={inputClass} inputMode="numeric" required value={shipping} onChange={e=>setShipping(e.target.value)}/></Field>
  <Field label="توضیحات قابل‌نمایش در فاکتور"><textarea className={inputClass} value={terms} maxLength={1000} onChange={e=>setTerms(e.target.value)}/></Field>
  <ErrorBox message={error}/><div className="flex gap-3"><Button>بازبینی فاکتور پیش از تأیید</Button><Button secondary type="button" onClick={()=>setOpen(false)}>انصراف</Button></div>
 </form>;
}
