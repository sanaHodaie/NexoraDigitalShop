import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Check } from 'lucide-react';
import { api, resetCsrf } from '../../api/client';

export function ChangePassword() {
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const submit = async event => {
    event.preventDefault(); setError(''); setSuccess(false);
    if (values.newPassword !== values.confirm) { setError('تکرار رمز عبور با رمز جدید یکسان نیست.'); return; }
    if (values.currentPassword === values.newPassword) { setError('رمز جدید باید با رمز فعلی متفاوت باشد.'); return; }
    setBusy(true);
    try {
      await api('/account/password', { method: 'POST', body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }) });
      resetCsrf(); setValues({ currentPassword: '', newPassword: '', confirm: '' }); setVisible(false); setSuccess(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <section className="account-panel account-password-panel"><h2><KeyRound size={21} /> تغییر رمز عبور</h2>
    <p className="account-muted">رمز جدید باید ۱۲ تا ۱۲۸ کاراکتر باشد. پس از تغییر، دستگاه‌های دیگر از حساب خارج می‌شوند.</p>
    <form className="account-form" onSubmit={submit} aria-busy={busy}>
      {[['currentPassword', 'رمز عبور فعلی'], ['newPassword', 'رمز عبور جدید'], ['confirm', 'تکرار رمز جدید']].map(([key, label]) => <label key={key}>{label}<input name={key} type={visible ? 'text' : 'password'} required minLength={key === 'currentPassword' ? 1 : 12} maxLength={128} autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} value={values[key]} disabled={busy} onChange={e => { setValues({ ...values, [key]: e.target.value }); setSuccess(false); }} /></label>)}
      <button type="button" className="account-password-visibility" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}{visible ? 'پنهان کردن رمزها' : 'نمایش رمزها'}</button>
      {error && <p role="alert" className="account-error">{error}</p>}
      {success && <p role="status" className="account-success"><Check size={18} />رمز عبور با موفقیت تغییر کرد.</p>}
      <button className="account-button" disabled={busy}>{busy ? 'در حال ذخیره…' : 'تغییر رمز عبور'}</button>
    </form>
  </section>;
}
