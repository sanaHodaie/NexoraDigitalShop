import React, { useEffect, useState } from 'react';
import { api, resetCsrf } from '../api/client';
import { useShop } from '../context/ShopContext';
import './account.css';

export default function VerifyEmailPage() {
  const { setUser, setIsAuthOpen } = useShop();
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const changing = window.location.pathname.startsWith('/confirm-email-change');
  useEffect(() => { window.history.replaceState(window.history.state, '', window.location.pathname); }, []);
  const verify = async () => {
    setBusy(true); setError('');
    try {
      await api(changing ? '/auth/confirm-email-change' : '/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) });
      resetCsrf(); setDone(true);
      if (changing) window.dispatchEvent(new Event('nexora:session-expired'));
      else await api('/auth/me').then(setUser).catch(() => {});
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <div className="account-page" dir="rtl"><section className="account-panel">
    <h1>{changing ? 'تأیید تغییر ایمیل' : 'تأیید ایمیل حساب'}</h1>
    {done ? <><p role="status">ایمیل شما تأیید شد.</p><a className="account-button" href="/account">حساب کاربری</a><button className="account-button secondary" onClick={() => setIsAuthOpen(true)}>ورود به حساب</button></> : <>
      <p>برای تأیید آدرس ایمیل خود دکمهٔ زیر را بزنید. این لینک فقط یک بار قابل استفاده است.</p>
      {error && <p role="alert" className="account-error">{error}</p>}
      {!token && <p role="alert">لینک معتبر نیست. از حساب کاربری درخواست ایمیل جدید بدهید.</p>}
      <button className="account-button" disabled={busy || !token} onClick={verify}>{busy ? 'در حال تأیید…' : 'تأیید ایمیل'}</button>
    </>}
  </section></div>;
}
