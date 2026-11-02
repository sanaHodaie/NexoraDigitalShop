import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function TelegramConnection() {
  const [status, setStatus] = useState(null);
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = async () => {
    setBusy(true); setError('');
    try { const value = await api('/account/telegram'); setStatus(value); if (value.linked) setLink(null); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  useEffect(() => { refresh(); }, []);
  const connect = async () => {
    setBusy(true); setError(''); setLink(null);
    try { setLink(await api('/account/telegram/link', { method: 'POST' })); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const unlink = async () => {
    setBusy(true); setError('');
    try { await api('/account/telegram', { method: 'DELETE' }); setLink(null); setStatus(s => ({ ...s, linked: false })); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <section className="account-panel" aria-busy={busy}>
    <h2>اتصال تلگرام</h2>
    <p>{status?.linked ? 'حساب تلگرام شما متصل است.' : 'حساب تلگرام خود را با لینک یک‌بارمصرف به فروشگاه وصل کنید.'}</p>
    {status && !status.configured && !status.linked && <p>اتصال تلگرام هنوز توسط فروشگاه فعال نشده است.</p>}
    {error && <p role="alert" className="account-error">{error}</p>}
    {status?.linked ? <button className="account-button secondary" disabled={busy} onClick={unlink}>قطع اتصال تلگرام</button> : status?.configured && <button className="account-button" disabled={busy} onClick={connect}>دریافت لینک اتصال</button>}
    {link && <p><a className="account-button" href={link.url} target="_blank" rel="noopener noreferrer">باز کردن ربات در تلگرام</a><br/>این لینک ۱۰ دقیقه اعتبار دارد؛ آن را برای دیگران نفرستید. پس از تأیید در ربات، بررسی وضعیت را بزنید.</p>}
    <button className="account-button secondary" disabled={busy} onClick={refresh}>بررسی وضعیت اتصال</button>
  </section>;
}
