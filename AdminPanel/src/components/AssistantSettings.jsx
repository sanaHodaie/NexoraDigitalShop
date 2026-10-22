import React, {useState} from 'react';
import {write} from '../api';
import {Button, ErrorBox, Field, Heading, inputClass, LoadState, Panel, useResource} from './ManagementUI';

export default function AssistantSettings({can}) {
  const resource = useResource('/admin/assistant');
  return <><Heading title="راهنمای هوشمند خرید" subtitle="پاسخ‌ها از محصولات فعال، قیمت و موجودی فروشگاه ساخته می‌شوند."/>
    <LoadState {...resource}/>{resource.data && <Editor key={resource.data.version} document={resource.data} canEdit={can('assistant:write')} reload={resource.reload}/>}</>;
}

function Editor({document, canEdit, reload}) {
  const [form, setForm] = useState(document.data), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [question, setQuestion] = useState('لپ‌تاپ برای برنامه‌نویسی تا ۵۰ میلیون تومان');
  const [preview, setPreview] = useState(null), [testing, setTesting] = useState(false);
  const field = (name, value) => setForm(old => ({...old, [name]:value}));
  async function save(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {await write('/admin/assistant', 'PUT', {data:form,version:document.version}); reload();}
    catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  async function test(e) {
    e.preventDefault(); setTesting(true); setError('');
    try {setPreview(await write('/assistant/chat','POST',{messages:[{role:'user',content:question}]}));}
    catch(e) {setError(e.message);} finally {setTesting(false);}
  }
  return <div className="grid lg:grid-cols-2 gap-6"><Panel><ErrorBox message={error}/>
    <div className="rounded-2xl bg-purple-50 dark:bg-purple-950/30 p-4 text-sm leading-7 mb-5">
      <p className="font-bold">{document.configured ? `${document.provider} · ${document.model}` : `اتصال ${document.provider} هنوز تنظیم نشده است`}</p>
      <p className="text-xs mt-2">ارائه‌دهنده را در ASSISTANT_PROVIDER و نام مدل را در ASSISTANT_MODEL تنظیم کنید. کلید گوگل در GEMINI_API_KEY و کلید OpenAI در OPENAI_API_KEY قرار می‌گیرد؛ فقط ارائه‌دهندهٔ انتخاب‌شده استفاده می‌شود. کلید در این پنل نمایش داده نمی‌شود. بدون اتصال مدل یا پس از رسیدن به سقف روزانه، راهنمای پایهٔ کاتالوگ پاسخ می‌دهد.</p>
    </div>
    <form onSubmit={save} className="space-y-5">
      {[['enabled','فعال بودن راهنمای خرید'],['useModel',`استفاده از ${document.provider} برای درک درخواست`]].map(([key,label])=><label key={key} className="flex gap-3 items-center text-sm"><input type="checkbox" checked={form[key]} disabled={!canEdit} onChange={e=>field(key,e.target.checked)} className="accent-purple-600 w-5 h-5"/>{label}</label>)}
      <Field label="پیام خوش‌آمد"><textarea value={form.greeting} onChange={e=>field('greeting',e.target.value)} disabled={!canEdit} maxLength={300} required rows={3} className={inputClass}/></Field>
      <div className="grid sm:grid-cols-2 gap-4"><Field label="تعداد پیشنهادها (۱ تا ۴)"><input type="number" min={1} max={4} required disabled={!canEdit} className={inputClass} value={form.maxRecommendations} onChange={e=>field('maxRecommendations',Number(e.target.value))}/></Field>
      <Field label="سقف درخواست مدل در روز (UTC)"><input type="number" min={1} max={10000} required disabled={!canEdit} className={inputClass} value={form.dailyLimit} onChange={e=>field('dailyLimit',Number(e.target.value))}/></Field></div>
      <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">این سقف تعداد درخواست است؛ هزینه به مدل، سهمیه و توکن‌ها بستگی دارد. مصرف را در حساب ارائه‌دهنده هم بررسی کنید. متن گفت‌وگوها در دیتابیس ثبت نمی‌شود؛ تغییر تنظیمات در گزارش امنیتی ثبت می‌شود.</p>
      {canEdit && <Button disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}</Button>}
    </form></Panel>
    <Panel><h2 className="font-bold mb-3">آزمایش با محصولات واقعی</h2><p className="text-xs leading-6 mb-4 text-slate-500">آزمایش از تنظیمات ذخیره‌شده و همان محدودیت درخواست کاربران استفاده می‌کند.</p>
      <form onSubmit={test} className="space-y-3"><Field label="پرسش نمونه"><textarea value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} required rows={3} className={inputClass}/></Field><Button disabled={testing || !question.trim()} secondary>{testing ? 'در حال بررسی…' : 'آزمایش پاسخ'}</Button></form>
      {preview && <div className="mt-5 text-sm leading-7">
        <p className="whitespace-pre-wrap">{preview.text}</p>
        <p className="text-xs text-purple-600 dark:text-purple-300 my-3">روش پاسخ: {preview.mode==='deepseek'?'تفسیر با DeepSeek و دادهٔ فروشگاه':preview.mode==='gemini'?'تفسیر با Google Gemini و دادهٔ فروشگاه':preview.mode==='openai'?'تفسیر با OpenAI و دادهٔ فروشگاه':'راهنمای پایهٔ کاتالوگ'}</p>
        {preview.products.map(p=><div key={p.id} className="border-t border-purple-100 dark:border-purple-900 py-3"><b>{p.name}</b><p>{new Intl.NumberFormat('fa-IR').format(p.priceRial)} ریال</p><p className="text-xs">{p.specs.join(' · ') || 'مشخصات ثبت نشده'}</p></div>)}
      </div>}
    </Panel></div>;
}
