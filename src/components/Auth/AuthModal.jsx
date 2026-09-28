import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';

export function AuthModal() {
  const { isAuthOpen, setIsAuthOpen, authenticate } = useShop();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!isAuthOpen) return null;
  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await authenticate(email, password, register); setPassword(''); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <div role="dialog" aria-modal="true" aria-label="حساب کاربری" className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" dir="rtl">
    <form onSubmit={submit} className="bg-white dark:bg-slate-900 rounded-2xl p-7 w-full max-w-sm space-y-4 shadow-xl">
      <div className="flex justify-between items-center"><h2 className="font-bold text-xl">{register ? 'ساخت حساب' : 'ورود به حساب'}</h2><button type="button" onClick={() => setIsAuthOpen(false)} aria-label="بستن">✕</button></div>
      <label className="block">ایمیل<input className="block w-full border rounded-lg p-2 text-slate-900" type="email" required autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block">رمز عبور<input className="block w-full border rounded-lg p-2 text-slate-900" type="password" required minLength={register ? 12 : undefined} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <button disabled={busy} className="w-full bg-blue-600 text-white rounded-lg p-3 disabled:opacity-50">{busy ? 'لطفاً صبر کنید…' : register ? 'ثبت‌نام' : 'ورود'}</button>
      <button type="button" className="text-blue-600 text-sm" onClick={() => { setRegister(!register); setError(''); }}>{register ? 'قبلاً حساب ساخته‌اید؟ ورود' : 'حساب ندارید؟ ثبت‌نام'}</button>
    </form>
  </div>;
}
