import React, {useState} from 'react';
import {ArrowRight, TrendingUp, CheckCircle2} from 'lucide-react';
import {write} from '../api';
import {CATALOG_CATEGORIES} from '../../../src/data/catalog';
import Select from './Select';
import {Heading, Panel, Button, Field, ErrorBox, inputClass, number, useResource} from './ManagementUI';

const normalizePercent = value => value.replace(/[۰-۹٠-٩]/g, digit => {
  const code = digit.charCodeAt(0);
  return String(code >= 1776 ? code - 1776 : code - 1632);
}).replace(/٫/g, '.').trim();

export default function BulkPricePage() {
  const [category, setCategory] = useState('smartphones');
  const [brand, setBrand] = useState('');
  const [percent, setPercent] = useState('15');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [page, setPage] = useState(1);
  const brands = useResource(`/admin/products/pricing/brands?category=${encodeURIComponent(category)}`);
  const reset = () => {setPreview(null); setError(''); setConfirmed(false); setPage(1);};
  const submit = async apply => {
    if (busy || (apply && (!preview || !confirmed))) return;
    const value = normalizePercent(percent);
    if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > 100) {
      setError('درصد افزایش را بیشتر از صفر تا ۱۰۰ و با حداکثر دو رقم اعشار وارد کنید.'); return;
    }
    setBusy(true); setError('');
    try {
      const result = await write('/admin/products/pricing', 'POST', {
        category, brand:brand || null, percent:value, ...(apply ? {snapshot:preview.snapshot} : {}),
      });
      setPreview(result); setConfirmed(false); setPage(1);
    } catch (e) {
      setError(e.message); setPreview(null); setConfirmed(false);
    } finally {setBusy(false);}
  };
  return <div className="space-y-6 pb-12 min-w-0" dir="rtl">
    <a href="#products" className="inline-flex items-center gap-2 text-xs text-purple-600 dark:text-purple-300"><ArrowRight size={16}/>بازگشت به محصولات</a>
    <Heading title="تغییر گروهی قیمت محصولات" subtitle="دسته و برند را انتخاب کنید؛ قیمت‌های جدید را ببینید و سپس افزایش را اعمال کنید."/>
    <Panel>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Field label="گروه کالا"><Select aria-label="گروه کالا برای تغییر قیمت" disabled={busy} className={inputClass} value={category} onChange={e=>{setCategory(e.target.value);setBrand('');reset();}}>{Object.entries(CATALOG_CATEGORIES).map(([id,c])=><option value={id} key={id}>{c.title}</option>)}</Select></Field>
        <Field label="برند"><Select aria-label="برند برای تغییر قیمت" disabled={busy||brands.loading||Boolean(brands.error)} className={inputClass} value={brand} onChange={e=>{setBrand(e.target.value);reset();}}><option value="">همهٔ برندهای این دسته</option>{brands.data?.items.map(name=><option value={name} key={name}>{name}</option>)}</Select></Field>
        <Field label="درصد افزایش"><div className="relative"><input aria-label="درصد افزایش قیمت" inputMode="decimal" dir="ltr" className={`${inputClass} pl-10`} disabled={busy} value={percent} maxLength={7} onChange={e=>{setPercent(e.target.value);reset();}}/><span className="absolute left-4 top-3 text-purple-500">٪</span></div></Field>
      </div>
      <div className="my-4 text-xs leading-7 text-slate-500 dark:text-slate-400">
        <p>مثلاً با افزایش ۱۵٪، قیمت ۱٬۰۰۰٬۰۰۰ ریالی به ۱٬۱۵۰٬۰۰۰ ریال می‌رسد. قیمت نهایی به نزدیک‌ترین ریال گرد می‌شود.</p>
        <p>همهٔ محصولات این فیلتر، شامل محصولات بایگانی‌شده و ناموجود، بررسی می‌شوند. مبلغ سفارش‌ها و فاکتورهای قبلی تغییر نمی‌کند.</p>
      </div>
      <ErrorBox message={brands.error}/>{brands.error&&<Button secondary onClick={brands.reload}>دریافت دوبارهٔ برندها</Button>}
      <Button disabled={busy||brands.loading||Boolean(brands.error)} onClick={()=>submit(false)}><TrendingUp size={16} className="inline ml-2"/>{busy?'در حال پردازش…':'پیش‌نمایش قیمت‌ها'}</Button>
    </Panel>
    <ErrorBox message={error}/>
    {preview?.applied && <div role="status" className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-5 flex gap-3 text-sm leading-7"><CheckCircle2 size={22} className="shrink-0 mt-1"/><span>قیمت {number(preview.changed)} محصول با افزایش {number(preview.percent)}٪ به‌روزرسانی شد.</span></div>}
    {preview && <Panel>
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5"><h2 className="font-bold text-sm">{preview.applied?'نتیجهٔ تغییر قیمت':'پیش‌نمایش تغییر قیمت'} · {CATALOG_CATEGORIES[preview.category].title}{preview.brand?` · ${preview.brand}`:''}</h2><span className="text-xs rounded-xl px-3 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">{number(preview.total)} محصول · افزایش {number(preview.percent)}٪</span></div>
      {!preview.total ? <p className="py-6 text-center text-sm text-slate-500">محصولی با این دسته و برند پیدا نشد.</p> : <>
        <div className="max-w-full overflow-x-auto rounded-2xl border border-purple-100 dark:border-purple-900" tabIndex={0} aria-label="پیش‌نمایش تغییر گروهی قیمت">
          <table className="w-full min-w-[640px] text-right text-xs"><thead className="bg-purple-50 dark:bg-purple-950/30"><tr>{['محصول','برند','قیمت فعلی (ریال)','افزایش (ریال)','قیمت جدید (ریال)'].map(label=><th className="p-4 whitespace-nowrap" key={label}>{label}</th>)}</tr></thead><tbody>{preview.items.slice((page-1)*20,page*20).map(p=><tr key={p.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-4 max-w-64 break-words"><strong className="block leading-6">{p.name}</strong><span className="block text-slate-400 mt-1" dir="ltr">{p.id}</span>{!p.isActive&&<span className="text-[10px] text-amber-600">بایگانی</span>}</td><td className="p-4">{p.brand||'—'}</td><td className="p-4 whitespace-nowrap text-slate-500">{number(p.oldPriceRial)}</td><td className="p-4 whitespace-nowrap text-amber-600">{number(p.differenceRial)}</td><td className="p-4 whitespace-nowrap font-bold text-purple-700 dark:text-purple-300">{number(p.newPriceRial)}</td></tr>)}</tbody></table>
        </div>
        {preview.total>20&&<div className="flex justify-center items-center gap-3 text-xs mt-4"><Button secondary disabled={page===1} onClick={()=>setPage(p=>p-1)}>قبلی</Button><span>صفحه {number(page)} از {number(Math.ceil(preview.total/20))}</span><Button secondary disabled={page*20>=preview.total} onClick={()=>setPage(p=>p+1)}>بعدی</Button></div>}
        {!preview.applied && <div className="mt-6 space-y-4">
          {preview.changed ? <><label className="flex gap-3 items-start text-sm leading-7 cursor-pointer"><input type="checkbox" className="mt-2 accent-purple-600 shrink-0" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>افزایش {number(preview.percent)}٪ برای {number(preview.changed)} محصول مطابق پیش‌نمایش را تأیید می‌کنم.</span></label><Button disabled={busy||!confirmed} onClick={()=>submit(true)}>{busy?'در حال ثبت…':`اعمال افزایش برای ${number(preview.changed)} محصول`}</Button></> : <p className="text-xs text-slate-500">با این درصد و گردکردن به ریال، قیمتی تغییر نمی‌کند.</p>}
        </div>}
      </>}
    </Panel>}
  </div>;
}
