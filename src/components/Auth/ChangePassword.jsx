import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Check } from 'lucide-react';
import { api, resetCsrf } from '../../api/client';

export function ChangePassword() {
  const [values, setValues] = useState({ newPassword: '', confirm: '' });
  const [visible, setVisible] = useState({ newPassword: false, confirm: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const submit = async event => {
    event.preventDefault(); setError(''); setSuccess(false);
    if (values.newPassword !== values.confirm) { setError('تکرار رمز عبور با رمز جدید یکسان نیست.'); return; }
    setBusy(true);
    try {
      await api('/account/password', { method: 'POST', body: JSON.stringify({ newPassword: values.newPassword }) });
      resetCsrf(); setValues({ newPassword: '', confirm: '' }); setVisible({ newPassword: false, confirm: false }); setSuccess(true);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <section className="account-panel account-password-panel"><h2><KeyRound size={21} /> تغییر رمز عبور</h2>
    <p className="account-muted">رمز جدید باید ۱۲ تا ۱۲۸ کاراکتر باشد. پس از تغییر، دستگاه‌های دیگر از حساب خارج می‌شوند.</p>
    <form className="account-form" onSubmit={submit} aria-busy={busy}>
      {[['newPassword', 'رمز عبور جدید'], ['confirm', 'تکرار رمز جدید']].map(([key, label]) => <label key={key}>{label}<span className="account-password-input"><input name={key} type={visible[key] ? 'text' : 'password'} required minLength={12} maxLength={128} autoComplete="new-password" value={values[key]} disabled={busy} onChange={e => { setValues({ ...values, [key]: e.target.value }); setSuccess(false); }} /><button type="button" disabled={busy} aria-label={`${visible[key] ? 'پنهان کردن' : 'نمایش'} ${label}`} aria-pressed={visible[key]} onClick={() => setVisible({ ...visible, [key]: !visible[key] })}>{visible[key] ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>)}
      {error && <p role="alert" className="account-error">{error}</p>}
      {success && <p role="status" className="account-success"><Check size={18} />رمز عبور با موفقیت تغییر کرد.</p>}
      <button className="account-button" disabled={busy}>{busy ? 'در حال ذخیره…' : 'تغییر رمز عبور'}</button>
    </form>
  </section>;
}
