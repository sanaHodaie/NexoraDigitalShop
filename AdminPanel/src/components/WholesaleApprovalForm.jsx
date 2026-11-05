import React,{useState} from 'react';
import {write} from '../api';
import {Button,Field,ErrorBox,inputClass} from './ManagementUI';
const rial=value=>new Intl.NumberFormat('fa-IR').format(BigInt(value||0))+' ریال';
export default function WholesaleApprovalForm({item,onSaved}) {
 const [open,setOpen]=useState(false),[lines,setLines]=useState([{name:item.details.items,quantity:item.details.quantity,unitPriceRial:''}]);
 const [shipping,setShipping]=useState('0'),[terms,setTerms]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const change=(index,key,value)=>setLines(rows=>rows.map((r,i)=>i===index?{...r,[key]:value}:r));
 const submit=async event=>{
  event.preventDefault();setBusy(true);setError('');
  try{const result=await write('/admin/customer-requests/'+item.id+'/approve','POST',{version:item.version,lines:lines.map(l=>({...l,name:l.name.trim(),quantity:Number(l.quantity),unitPriceRial:Number(l.unitPriceRial)})),shippingRial:Number(shipping),terms});onSaved({...result,deliveryStatus:'pending'});setOpen(false);}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 if(!open)return <Button onClick={()=>setOpen(true)}>بررسی و صدور فاکتور عمده</Button>;
 return <form className="rounded-2xl border border-purple-200 dark:border-purple-800 p-4 space-y-4" onSubmit={submit}>
  <h3 className="font-bold">تأیید سفارش و صدور فاکتور PDF</h3><p className="text-xs leading-6 text-slate-500">اطلاعات مشتری و نشانی خودکار درج می‌شود. اقلام و تعداد هر قلم را بررسی و قیمت توافقی را به ریال وارد کنید؛ فاکتور و کد رهگیری پس از تأیید ثابت می‌مانند. این کار پرداخت را تأیید نمی‌کند.</p>
  {lines.map((line,index)=><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3" key={index}>
   <Field label={'شرح قلم '+(index+1)}><input className={inputClass} value={line.name} required maxLength={300} onChange={e=>change(index,'name',e.target.value)}/></Field>
   <Field label="تعداد"><input className={inputClass} type="number" min={1} max={1000000} step={1} required value={line.quantity} onChange={e=>change(index,'quantity',e.target.value)}/></Field>
   <Field label="قیمت واحد (ریال)"><input className={inputClass} type="number" min={1} max={1000000000000} step={1} required value={line.unitPriceRial} onChange={e=>change(index,'unitPriceRial',e.target.value)}/></Field>
   {lines.length>1&&<Button secondary type="button" onClick={()=>setLines(rows=>rows.filter((_,i)=>i!==index))}>حذف قلم</Button>}
  </div>)}
  <Button secondary type="button" disabled={lines.length>=50} onClick={()=>setLines(rows=>[...rows,{name:'',quantity:1,unitPriceRial:''}])}>افزودن قلم</Button>
  <Field label="هزینه ارسال توافقی (ریال)"><input className={inputClass} type="number" min={0} max={1000000000000} step={1} required value={shipping} onChange={e=>setShipping(e.target.value)}/></Field>
  <Field label="توضیحات قابل‌نمایش در فاکتور"><textarea className={inputClass} value={terms} maxLength={1000} onChange={e=>setTerms(e.target.value)}/></Field>
  <p className="font-bold">جمع: {rial(lines.reduce((total,l)=>total+BigInt(/^\d+$/.test(String(l.quantity))?l.quantity:0)*BigInt(/^\d+$/.test(String(l.unitPriceRial))?l.unitPriceRial:0),BigInt(/^\d+$/.test(shipping)?shipping:0)))}</p>
  <ErrorBox message={error}/><div className="flex gap-3"><Button disabled={busy}>{busy?'در حال تأیید…':'تأیید نهایی و ارسال فاکتور در تلگرام'}</Button><Button secondary type="button" disabled={busy} onClick={()=>setOpen(false)}>انصراف</Button></div>
 </form>;
}
