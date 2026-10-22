import React, {useRef, useState} from 'react';
import {CheckCircle2, Download, FileSpreadsheet, UploadCloud} from 'lucide-react';
import {api} from '../api';
import {Button, ErrorBox, Modal, number} from './ManagementUI';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const labels = {id:'شناسه', name:'نام فارسی', nameEn:'نام انگلیسی', category:'دسته‌بندی', priceRial:'قیمت ریال', stock:'موجودی'};

export default function ProductImportModal({onClose, onSaved}) {
  const picker = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const selectFile = event => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    setResult(null); setFile(null); setError(''); setPage(1);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.xlsx') || selected.size > 2 * 1024 * 1024) {
      setError('فایل XLSX با حجم حداکثر ۲ مگابایت انتخاب کنید. فایل XLS قدیمی را در اکسل با فرمت XLSX ذخیره کنید.');
      return;
    }
    setFile(selected);
  };
  const submit = async (commit = false) => {
    if (!file || busy) return;
    setBusy(true); setError('');
    try {
      const data = await api(`/admin/products/import?commit=${commit}`, {
        method:'POST', body:file, headers:{'Content-Type':XLSX_TYPE},
      });
      setResult(data); setPage(1);
      if (data.created) { setFile(null); onSaved(); }
    } catch (e) {
      setError(e.message);
      // Require a fresh preview after a failed or uncertain commit.
      setResult(null);
    } finally { setBusy(false); }
  };
  return <Modal title="افزودن گروهی محصولات از اکسل" onClose={() => {if (!busy) onClose();}}>
    <div className="space-y-5 min-w-0" dir="rtl">
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-7">اطلاعات محصولات را از اکسل وارد کنید؛ عکس هر محصول را بعداً از «ویرایش محصول» اضافه کنید. ابتدا پیش‌نمایش را بررسی و سپس ثبت نهایی را تأیید کنید.</p>
      <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 p-4 space-y-3 text-xs leading-7">
        <a href="/api/admin/products/import/template" download="nexora-products.xlsx" className="inline-flex items-center gap-2 font-bold text-purple-700 dark:text-purple-300"><Download size={17}/>دانلود قالب اکسل و راهنمای دسته‌بندی‌ها</a>
        <p>ستون‌های الزامی: شناسه، نام فارسی، نام انگلیسی، دسته‌بندی، قیمت ریال و موجودی. برند، توضیحات، مشخصات و برچسب اختیاری‌اند. ستون‌های انگلیسی قالب هم پذیرفته می‌شوند.</p>
        <p>فقط برگهٔ اول خوانده می‌شود؛ حداکثر ۵۰۰ محصول، بدون فرمول. شناسه باید یکتا و شامل حروف کوچک انگلیسی، عدد و خط تیره باشد. ردیف نمونه را با محصولات خود جایگزین کنید.</p>
        <p>محصولات به‌صورت بایگانی ثبت می‌شوند؛ پس از افزودن عکس، وضعیت نمایش را فعال کنید. هیچ محصول قبلی بازنویسی نمی‌شود.</p>
      </div>
      <ErrorBox message={error}/>
      {result?.created > 0 && <div role="status" className="flex gap-3 rounded-2xl p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-sm leading-7"><CheckCircle2 className="shrink-0 mt-1" size={20}/><span>{number(result.created)} محصول ثبت شد. این پنجره را ببندید و از دکمهٔ ویرایش هر محصول، عکس را اضافه و محصول را فعال کنید.</span></div>}
      <div className="rounded-3xl border-2 border-dashed border-purple-200 dark:border-purple-800 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <FileSpreadsheet className="text-purple-500 shrink-0" size={34}/>
        <div className="flex-1 min-w-0 text-xs space-y-2"><strong className="block break-all">{file?.name || 'فایل محصولات را انتخاب کنید'}</strong><span className="text-slate-500">XLSX · حداکثر ۲ مگابایت · قیمت‌ها به ریال</span></div>
        <input ref={picker} type="file" accept=".xlsx" aria-label="فایل اکسل محصولات" className="hidden" disabled={busy} onChange={selectFile}/>
        <Button type="button" secondary disabled={busy} onClick={() => picker.current?.click()}><UploadCloud size={16} className="inline ml-2"/>{file ? 'تعویض فایل' : 'انتخاب فایل اکسل'}</Button>
      </div>
      {result && !result.created && <section className="space-y-3" aria-label="پیش‌نمایش اکسل">
        <h3 className="font-bold text-sm">پیش‌نمایش · {number(result.items.length)} ردیف خوانده‌شده</h3>
        {result.errors.length > 0 && <div role="alert" className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 p-4 text-xs leading-7 text-rose-700 dark:text-rose-300">
          <strong>هیچ محصولی ثبت نشده است. خطاها را در فایل اصلاح و دوباره بارگذاری کنید.</strong>
          <ul className="max-h-44 overflow-y-auto mt-2 space-y-1">{result.errors.map((item, i) => <li key={i}>ردیف {number(item.row)}{item.field ? ` · ${labels[item.field] || item.field}` : ''}: {item.message}</li>)}</ul>
        </div>}
        {result.items.length > 0 && <>
          <div className="max-w-full overflow-x-auto rounded-2xl border border-purple-100 dark:border-purple-900" tabIndex={0} aria-label="جدول محصولات اکسل">
            <table className="w-full text-xs text-right min-w-[560px]"><thead className="bg-purple-50 dark:bg-purple-950/30"><tr>{['ردیف','شناسه و محصول','دسته‌بندی','قیمت (ریال)','موجودی'].map(label => <th key={label} className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead>
              <tbody>{result.items.slice((page - 1) * 20, page * 20).map(item => <tr key={item.row} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3">{number(item.row)}</td><td className="p-3 max-w-64 break-words"><strong className="block leading-6">{item.name}</strong><span className="block text-slate-500 mt-1" dir="ltr">{item.id}</span></td><td className="p-3">{item.categoryFa}</td><td className="p-3 whitespace-nowrap">{number(item.priceRial)}</td><td className="p-3">{number(item.stock)}</td></tr>)}</tbody>
            </table>
          </div>
          {result.items.length > 20 && <div className="flex items-center justify-center gap-3 text-xs"><Button secondary disabled={page === 1} onClick={() => setPage(p => p - 1)}>قبلی</Button><span>صفحهٔ {number(page)} از {number(Math.ceil(result.items.length / 20))}</span><Button secondary disabled={page * 20 >= result.items.length} onClick={() => setPage(p => p + 1)}>بعدی</Button></div>}
        </>}
      </section>}
      <div role="status" aria-live="polite" className="text-xs text-purple-600 dark:text-purple-300">{busy ? 'در حال بررسی و پردازش فایل؛ لطفاً منتظر بمانید…' : ''}</div>
      <div className="flex flex-wrap gap-3">
        {file && <Button disabled={busy} onClick={() => submit(false)}>بررسی و پیش‌نمایش</Button>}
        {file && result?.canImport && !result.created && <Button disabled={busy} onClick={() => submit(true)}>ثبت نهایی {number(result.items.length)} محصول</Button>}
        <Button secondary disabled={busy} onClick={onClose}>بستن</Button>
      </div>
    </div>
  </Modal>;
}
