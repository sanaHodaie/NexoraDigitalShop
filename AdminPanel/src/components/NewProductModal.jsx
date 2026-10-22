import React,{useRef,useState} from 'react';
import {UploadCloud,ImageIcon} from 'lucide-react';
import {CATALOG_CATEGORIES} from '../../../src/data/catalog';
import {toRial} from '../../../src/lib/money';
import {api,write} from '../api';
import Select from './Select';
import {Modal,Field,inputClass,Button,ErrorBox} from './ManagementUI';
export default function NewProductModal({editingProduct:p,onClose,onSaved}) {
 const existing=Boolean(p.id),picker=useRef(null);
 const [form,setForm]=useState({id:p.id||'',name:p.name||'',nameEn:p.nameEn||'',category:p.category||'smartphones',brand:p.brand||'',priceRial:toRial(p.price),stock:p.stock??0,isActive:p.isActive??true,image:p.image||'',description:p.description||'',specs:(p.specs||[]).join('\n'),badge:p.badge||''});
 const [error,setError]=useState(''),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false);
 const set=(k,v)=>setForm(f=>({...f,[k]:v}));
 const upload=async e=>{
   const file=e.target.files?.[0];e.target.value='';if(!file)return;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024){setError('عکس JPG، PNG یا WebP با حجم حداکثر ۲ مگابایت انتخاب کنید.');return;}
   setUploading(true);setError('');
   try{const result=await api('/admin/media',{method:'POST',body:file,headers:{'Content-Type':file.type}});set('image',result.url);}
   catch(e){setError(e.message);}finally{setUploading(false);}
 };
 const save=async e=>{e.preventDefault();if(uploading||!form.image||(form.isActive&&form.image==='/assets/products/product-pending.svg')){setError('پیش از فعال‌کردن محصول، عکس آن را انتخاب کنید و منتظر پایان بارگذاری بمانید.');return;}setSaving(true);setError('');try{const body={...form,categoryFa:CATALOG_CATEGORIES[form.category].title,priceRial:Number(form.priceRial),stock:Number(form.stock),expectedStock:existing?p.stock:null,specs:form.specs.split('\n').map(s=>s.trim()).filter(Boolean)};await write(existing?`/admin/products/${p.id}`:'/admin/products',existing?'PUT':'POST',body);onSaved();}catch(e){setError(e.message);}finally{setSaving(false);}};
 return <Modal title={existing?'ویرایش محصول':'افزودن محصول'} onClose={()=>{if(!saving&&!uploading)onClose();}}><form onSubmit={save} className="space-y-5"><ErrorBox message={error}/>
 <div className="rounded-3xl border-2 border-dashed border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-5 flex flex-col sm:flex-row items-center gap-5">
   <div className="w-28 h-28 shrink-0 rounded-2xl bg-white grid place-items-center overflow-hidden">{form.image?<img src={form.image} alt="پیش‌نمایش عکس محصول" className="w-full h-full object-contain"/>:<ImageIcon size={36} className="text-purple-300"/>}</div>
   <div className="space-y-3 min-w-0"><h3 className="font-bold text-sm">تصویر محصول</h3><p className="text-xs text-slate-500 leading-6">از گوشی یا کامپیوتر انتخاب کنید · JPG، PNG، WebP · حداکثر ۲ مگابایت و ۱۶ مگاپیکسل</p><input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="فایل تصویر محصول" onChange={upload}/><Button type="button" secondary disabled={uploading||saving} onClick={()=>picker.current?.click()}><UploadCloud size={16} className="inline ml-2"/>{uploading?'در حال بارگذاری…':form.image?'تعویض تصویر':'انتخاب تصویر'}</Button><span role="status" className="block text-xs text-purple-600 dark:text-purple-300">{uploading?'عکس در حال بررسی و ذخیره است.':''}</span></div>
 </div>
 <div className="grid sm:grid-cols-2 gap-4">
 {Object.entries({id:'شناسه یکتا (حروف کوچک انگلیسی و خط تیره)',name:'نام فارسی',nameEn:'نام انگلیسی',brand:'برند',priceRial:'قیمت پایه به ریال',stock:'موجودی قابل فروش',badge:'برچسب محصول'}).map(([key,label])=><Field key={key} label={label}><input disabled={key==='id'&&existing} required={['id','name','nameEn','priceRial','stock'].includes(key)} maxLength={key==='id'?80:200} type={['priceRial','stock'].includes(key)?'number':'text'} min="0" max={key==='priceRial'?'600000000000':'1000000'} step="1" className={inputClass} value={form[key]} onChange={e=>set(key,e.target.value)}/></Field>)}
 <Field label="دسته‌بندی"><Select aria-label="دسته‌بندی محصول" className={inputClass} value={form.category} onChange={e=>set('category',e.target.value)}>{Object.entries(CATALOG_CATEGORIES).map(([id,c])=><option value={id} key={id}>{c.title}</option>)}</Select></Field><Field label="نمایش در فروشگاه"><Select aria-label="وضعیت محصول" className={inputClass} value={String(form.isActive)} onChange={e=>set('isActive',e.target.value==='true')}><option value="true">فعال</option><option value="false">بایگانی</option></Select></Field></div>
 <Field label="مشخصات فنی؛ هر مورد در یک خط"><textarea className={inputClass} rows={4} value={form.specs} onChange={e=>set('specs',e.target.value)}/></Field><Field label="توضیحات"><textarea className={inputClass} rows={4} value={form.description} onChange={e=>set('description',e.target.value)}/></Field>
 <p className="text-xs text-slate-500 leading-6">قیمت ریالی دقیقاً مانند فروشگاه نمایش داده می‌شود. تغییر قیمت روی سفارش‌های قبلی اثر ندارد.</p><div className="flex gap-3"><Button disabled={saving||uploading}>{saving?'در حال ذخیره…':'ذخیره محصول'}</Button><Button type="button" secondary disabled={saving||uploading} onClick={onClose}>انصراف</Button></div></form></Modal>;
}
