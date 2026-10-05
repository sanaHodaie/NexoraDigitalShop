import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { api, resetCsrf } from '../../api/client';
import './recovery.css';

export function PasswordRecovery({ token, onLogin, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const submit = async event => {
    event.preventDefault(); setError('');
    if (token && password !== confirm) { setError('تکرار رمز عبور با رمز جدید یکسان نیست.'); return; }
    setBusy(true);
    try {
      if (token) {
        await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
        resetCsrf();
        window.dispatchEvent(new Event('nexora:session-expired'));
        setPassword(''); setConfirm('');
        setMessage('رمز عبور تغییر کرد. اکنون با رمز جدید وارد شوید.');
      } else {
        const result = await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
        setMessage(result.message);
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <div className="auth-recovery-content">
    <div className="auth-form-heading"><span className="recovery-icon">{token ? <KeyRound size={28} /> : <Mail size={28} />}</span>
      <h2 id="auth-title">{token ? 'رمز تازه، شروع دوباره' : 'رمز عبورت رو فراموش کردی؟'}</h2>
      <p>{token ? 'رمز جدیدی با ۱۲ تا ۱۲۸ کاراکتر انتخاب کن.' : 'ایمیل حسابت رو وارد کن تا لینک بازیابی برات ارسال بشه.'}</p></div>
    {message ? <div className="recovery-success" role="status"><ShieldCheck size={24} /><p>{message}</p></div> : <form className="auth-form" onSubmit={submit} aria-busy={busy}><fieldset disabled={busy}>
      {!token ? <label className="auth-field"><span>ایمیل حساب</span><input type="email" required maxLength={254} dir="ltr" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label> : <>
        <label className="auth-field"><span>رمز عبور جدید</span><div className="auth-password"><input type={visible ? 'text' : 'password'} required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /><button type="button" aria-label={visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
        <label className="auth-field"><span>تکرار رمز جدید</span><input type={visible ? 'text' : 'password'} required minLength={12} maxLength={128} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      </>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="auth-primary" disabled={busy}>{busy ? 'در حال ارسال…' : token ? 'ذخیرهٔ رمز جدید' : 'ارسال لینک بازیابی'}</button>
    </fieldset></form>}
    <button type="button" className="recovery-back" onClick={onLogin} disabled={busy}>بازگشت به ورود</button>
  </div>;
}
