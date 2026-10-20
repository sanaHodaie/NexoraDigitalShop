import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useShop } from '../../context/ShopContext';

// Drop into src/components/Assistant/AssistantWidget.jsx and render <AssistantWidget />
// next to <ToastContainer /> in App.jsx. Uses the site's own api() client (CSRF,
// cookies, error contract) and addToCart() (login prompt, stock checks, toasts).

const GREETING = 'سلام! من دستیار نکسورا هستم. بگویید دنبال چه محصولی می‌گردید و بودجه‌تان چقدر است تا کمکتان کنم.';
const SUGGESTIONS = ['بهترین گوشی تا ۵۰۰ میلیون ریال', 'مقایسه دو لپ‌تاپ', 'هدفون بی‌سیم پیشنهاد بده'];

export function AssistantWidget() {
  const { addToCart, toPersianDigits } = useShop();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING, local: true }]);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, busy, open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async raw => {
    const content = raw.trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next); setInput(''); setError(''); setBusy(true);
    try {
      const payload = next.filter(m => !m.local).map(({ role, content: text }) => ({ role, content: text }));
      const data = await api('/assistant/chat', { method: 'POST', body: JSON.stringify({ messages: payload }) });
      setMessages(m => [...m, { role: 'assistant', content: data.reply, actions: data.actions, products: data.products }]);
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  return <>
    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="دستیار خرید نکسورا"
      className="fixed bottom-5 left-5 z-40 h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-400 text-white shadow-lg shadow-blue-500/30 grid place-items-center hover:scale-105 transition-transform">
      <span aria-hidden="true" className="text-2xl">{open ? '✕' : '✦'}</span>
    </button>
    {open && <section dir="rtl" role="dialog" aria-label="دستیار خرید نکسورا"
      className="fixed z-40 bottom-24 left-5 w-[min(24rem,calc(100vw-2.5rem))] h-[min(34rem,calc(100vh-8rem))] flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl font-vazir">
      <header className="px-4 py-3 bg-gradient-to-l from-blue-700 via-indigo-600 to-sky-500 text-white">
        <h2 className="text-sm font-bold">دستیار خرید نکسورا</h2>
        <p className="text-[11px] opacity-90">پیشنهاد و مقایسه‌ی محصولات</p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
        {messages.map((m, i) => <div key={i} className={m.role === 'user' ? 'flex justify-start' : 'flex justify-end'}>
          <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-7 whitespace-pre-wrap ${m.role === 'user'
            ? 'bg-blue-600 text-white rounded-br-md' : 'bg-slate-100 dark:bg-slate-800 rounded-bl-md'}`}>
            {m.content}
            {m.products?.map(p => <div key={p.id} className="mt-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 text-xs">
              <div className="font-bold">{p.name}</div>
              <div className="text-slate-500 dark:text-slate-400">{p.priceText}{p.inStock ? '' : ' — ناموجود'}</div>
            </div>)}
            {m.actions?.map(a => <button key={a.productId} type="button" onClick={() => addToCart({ id: a.productId, name: a.productName }, a.quantity)}
              className="mt-2 w-full rounded-xl bg-gradient-to-l from-blue-700 to-indigo-600 text-white text-xs font-bold py-2 hover:opacity-90">
              افزودن «{a.productName}» به سبد{a.quantity > 1 ? ` (${toPersianDigits(a.quantity)} عدد)` : ''}
            </button>)}
          </div>
        </div>)}
        {messages.length === 1 && <div className="flex flex-wrap gap-2">{SUGGESTIONS.map(s =>
          <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-blue-200 dark:border-slate-600 px-3 py-1.5 text-xs text-blue-700 dark:text-sky-300 hover:bg-blue-50 dark:hover:bg-slate-800">{s}</button>)}</div>}
        {busy && <p role="status" className="text-xs text-slate-500 dark:text-slate-400">در حال نوشتن…</p>}
        {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2 p-3 border-t border-slate-200 dark:border-slate-700">
        <input value={input} onChange={e => setInput(e.target.value)} maxLength={1000} placeholder="پیام خود را بنویسید…" aria-label="پیام"
          className="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" disabled={busy || !input.trim()} className="rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">ارسال</button>
      </form>
    </section>}
  </>;
}
