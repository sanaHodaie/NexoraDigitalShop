import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Send, X, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { useShop } from '../../context/ShopContext';
import { formatPrice } from '../../lib/money';
import { optimizedImage } from '../../data/imageAssets';
import './assistant.css';

export default function AssistantDialog({ onClose }) {
  const { addToCart, isLoggedIn, setIsAuthOpen } = useShop();
  const [config, setConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState('');
  const request = useRef(null), dialog = useRef(null), log = useRef(null), input = useRef(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const controller = new AbortController();
    api('/assistant/config', { signal: controller.signal }).then(setConfig).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.querySelector('button').focus({ preventScroll: true });
    const key = e => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab') {
        const nodes = [...dialog.current.querySelectorAll('button:not(:disabled),a[href],textarea:not(:disabled)')].filter(n => n.getClientRects().length);
        const first = nodes[0], last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { controller.abort(); request.current?.abort(); document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    if (!log.current) return;
    const latest = log.current.querySelector('[data-latest-answer]');
    // Start at the answer, rather than skipping its explanation to the last product card.
    log.current.scrollTop = !busy && latest
      ? log.current.scrollTop + latest.getBoundingClientRect().top - log.current.getBoundingClientRect().top - 12
      : log.current.scrollHeight;
  }, [messages, busy]);

  async function submit(e) {
    e.preventDefault();
    if (busy || !question.trim() || !config?.enabled) return;
    const text = question.trim();
    const history = [...messages.filter(m => m.role === 'user').slice(-5), { role: 'user', content: text }];
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 22000);
    setBusy(true); setError('');
    try {
      const result = await api('/assistant/chat', { method: 'POST', signal: controller.signal, body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }) });
      setMessages(old => [...old.slice(-18), { role: 'user', content: text }, { role: 'assistant', content: result.text, ...result }]);
      setQuestion('');
    } catch (err) {
      if (dialog.current) setError(err.name === 'AbortError' ? 'پاسخ کمی طول کشید؛ دوباره تلاش کن. پرسشت حفظ شده است.' : err.message);
    } finally { clearTimeout(timeout); setBusy(false); }
  }
  async function add(product) {
    if (!isLoggedIn) { onClose(); setIsAuthOpen(true); return; }
    setAdding(product.id); try { await addToCart(product, 1); } finally { setAdding(''); }
  }
  return createPortal(<div className="nexora-assistant-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="assistant-title" dir="rtl" className="nexora-assistant bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2"><Sparkles className="text-blue-600 dark:text-blue-400" size={20}/><div><h2 id="assistant-title" className="font-bold">راهنمای خرید نکسورا</h2><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">انتخاب از محصولات همین فروشگاه</p></div></div>
        <button onClick={onClose} aria-label="بستن راهنمای خرید" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><X size={20}/></button>
      </header>
      <div ref={log} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4" role="log" aria-live="polite" aria-relevant="additions">
        <p className="text-sm leading-7">{config ? (config.enabled ? config.greeting : 'راهنمای خرید فعلاً غیرفعال است.') : 'در حال دریافت تنظیمات…'}</p>
        {!messages.length && config?.enabled && <div className="flex flex-wrap gap-2">{['لپ‌تاپ برای برنامه‌نویسی', 'هدفون تا ۱۰ میلیون تومان', 'هزینه ارسال چقدر است؟'].map(q => <button key={q} onClick={() => { setQuestion(q); input.current?.focus(); }} className="rounded-xl border border-blue-200 dark:border-blue-900 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">{q}</button>)}</div>}
        {messages.map((m, i) => <div key={i} data-latest-answer={m.role==='assistant' && i===messages.length-1 ? '' : undefined} className={`rounded-2xl p-3 text-sm leading-7 ${m.role === 'user' ? 'bg-blue-600 text-white mr-8' : 'bg-slate-50 dark:bg-slate-800'}`}>
          <p className="whitespace-pre-wrap break-words">{m.content}</p>
          {m.products?.map(p => <article key={p.id} className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
            <div className="flex gap-3 items-center"><img src={optimizedImage(p.image)} alt={p.name} width="64" height="64" loading="lazy" className="w-16 h-16 object-contain rounded-xl bg-white shrink-0"/><div className="min-w-0"><Link onClick={onClose} to={`/category/${encodeURIComponent(p.category)}?q=${encodeURIComponent(p.name)}`} className="font-bold text-blue-700 dark:text-blue-300">{p.name}</Link><p className="font-bold">{formatPrice(p.price)}</p></div></div>
            {p.specs?.length ? <ul className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">{p.specs.map((s, j) => <li key={j}>• {s}</li>)}</ul> : <p className="text-xs mt-2">مشخصات فنی ثبت نشده است.</p>}
            {p.demo && <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2">اطلاعات و قیمت نمونهٔ کاتالوگ؛ پیش از خرید تأیید شود.</p>}
            <button disabled={!p.inStock || Boolean(adding)} onClick={() => add(p)} className="mt-3 w-full rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 py-2 font-bold text-xs disabled:opacity-50">{!p.inStock ? 'ناموجود' : adding === p.id ? 'در حال افزودن…' : 'افزودن به سبد خرید'}</button>
          </article>)}
          {m.sources?.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="block text-xs text-blue-600 dark:text-blue-300 underline mt-2">{s.title}</a>)}
          {m.mode === 'catalog' && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">پاسخ راهنمای پایهٔ کاتالوگ</p>}
        </div>)}
        {busy && <p role="status" className="text-sm text-blue-600 dark:text-blue-300">در حال بررسی درخواست و محصولات…</p>}
      </div>
      <form onSubmit={submit} className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}
        <p className="text-[10px] leading-5 text-slate-500 dark:text-slate-400">{config?.externalModel ? `با ارسال پرسش، متن گفت‌وگو برای پردازش به ${config.provider} ارسال می‌شود. ` : ''}رمز، اطلاعات پرداخت یا اطلاعات خصوصی ننویس. گفت‌وگو در مرورگر ذخیره نمی‌شود.</p>
        <div className="flex items-end gap-2"><textarea ref={input} value={question} onChange={e => setQuestion(e.target.value)} rows={2} maxLength={1000} disabled={busy || !config?.enabled} aria-label="پرسش درباره محصولات" placeholder="برای چه کاری محصول می‌خواهی؟" className="min-w-0 flex-1 resize-none rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"/><button aria-label="ارسال پرسش" disabled={busy || !question.trim() || !config?.enabled} className="rounded-xl bg-blue-600 text-white p-3 disabled:opacity-40"><Send size={19}/></button></div>
      </form>
    </section>
  </div>, document.body);
}
