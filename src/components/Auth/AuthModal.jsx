import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Eye, EyeOff, X, ShieldCheck } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { GoogleSignIn } from './GoogleSignIn';
import { PasswordRecovery } from './PasswordRecovery';
import headphonesImage from '../../assets/images/auth-headphones.png';
import earbudsImage from '../../assets/images/auth-earbuds.png';
import './auth.css';

export function AuthModal() {
  const { isAuthOpen, setIsAuthOpen, authenticate, authenticateGoogle } = useShop();
  const dialog = useRef(null);
  const heading = useRef(null);
  const [view, setView] = useState('welcome');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const register = view === 'register';

  useLayoutEffect(() => {
    if (!isAuthOpen) return;
    setView('welcome'); setError(''); setPassword(''); setShowPassword(false);
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    dialog.current.showModal();
    return () => { document.body.style.overflow = previousOverflow; previousFocus?.focus({ preventScroll: true }); };
  }, [isAuthOpen]);
  useLayoutEffect(() => {
    if (!isAuthOpen) return;
    dialog.current.querySelector('.auth-scroll')?.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [view, isAuthOpen]);

  const switchView = next => { setView(next); setError(''); setNotice(''); setPassword(''); setShowPassword(false); };
  const submit = async event => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const result = await authenticate(email.trim(), password, register, fullName.trim());
      if (register) { switchView('login'); setNotice(result.message); }
    }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const googleLogin = async credential => {
    setError(''); setBusy(true);
    try { await authenticateGoogle(credential); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const close = () => setIsAuthOpen(false);
  if (!isAuthOpen) return null;

  return createPortal(
    <dialog ref={dialog} className="auth-dialog" dir="rtl" aria-labelledby="auth-title"
      onCancel={event => { event.preventDefault(); close(); }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <section className={`auth-shell ${view === 'welcome' ? 'auth-welcome' : 'auth-form-shell'}`}>
        <div className="auth-waves" aria-hidden="true" />
        <div className="auth-scroll">
        <div className="auth-handle" aria-hidden="true" />
        <div className="auth-topbar">
          {view !== 'welcome' ? <button type="button" className="auth-back" onClick={() => switchView('welcome')} disabled={busy}><ArrowRight size={16} /> بازگشت</button> : <span className="auth-wordmark" dir="ltr">NEXORA<span> / </span>ACCOUNT</span>}
          <button type="button" className="auth-close" onClick={close} aria-label="بستن پنجره ورود"><X size={18} /></button>
        </div>
        {view === 'welcome' ? <div className="auth-welcome-content">
          <h2 id="auth-title" ref={heading} tabIndex={-1}>به نکسورا خوش اومدی <span className="auth-smile" dir="ltr">:)</span></h2>
          <p>دنیای تازهٔ تکنولوژی منتظر توست.<br />وارد شو یا حساب خودت رو بساز؛ انتخاب با توست.</p>
          <div className="auth-gadgets" role="img" aria-label="هدفون و ایرپاد سه‌بعدی شناور">
            <span className="auth-gadget-halo" aria-hidden="true" />
            <img className="auth-gadget auth-gadget-headphones" src={headphonesImage} alt="" width="1024" height="1024" />
            <img className="auth-gadget auth-gadget-earbuds" src={earbudsImage} alt="" width="1024" height="1024" />
          </div>
          <div className="auth-welcome-actions">
            <button type="button" className="auth-primary auth-create" onClick={() => switchView('register')}>ساخت حساب کاربری <ArrowRight size={17} className="rotate-180" /></button>
            <button type="button" className="auth-secondary" onClick={() => switchView('login')}>ورود به حساب کاربری</button>
          </div>
          <span className="auth-welcome-note"><ShieldCheck size={14} /> یک حساب، یک تجربهٔ شخصی‌تر</span>
        </div> : view === 'forgot' ? <div className="auth-form-card"><PasswordRecovery initialEmail={email} onLogin={() => switchView('login')} /></div> : <div className="auth-form-card">
          <div className="auth-form-heading">
            <span className="auth-eyebrow">{register ? 'شروع یک تجربهٔ تازه' : 'خوش برگشتی'}</span>
            <h2 id="auth-title" ref={heading} tabIndex={-1}>{register ? 'حساب خودت رو بساز' : 'وارد حساب خودت شو'}</h2>
            <p>{register ? 'به جمع همراهان نکسورا بپیوند.' : 'خریدها و علاقه‌مندی‌هات منتظر تو هستن.'}<br />{register ? 'برای یک انتخاب هوشمندانه آماده‌ای؟' : 'خوشحالیم که دوباره اینجایی.'}</p>
          </div>
          <form onSubmit={submit} className="auth-form" aria-busy={busy}>
            <fieldset disabled={busy}>
              {register && <label className="auth-field"><span>نام و نام خانوادگی</span><input required maxLength={100} autoComplete="name" placeholder="نام کامل شما" value={fullName} onChange={event => setFullName(event.target.value)} /></label>}
              <label className="auth-field"><span>ایمیل</span><input type="email" dir="ltr" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} /></label>
              <label className="auth-field"><span>رمز عبور</span>
                <div className="auth-password">
                  <input type={showPassword ? 'text' : 'password'} required minLength={register ? 12 : undefined} maxLength={128} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'حداقل ۱۲ کاراکتر' : 'رمز عبور شما'} value={password} onChange={event => setPassword(event.target.value)} aria-describedby={register ? 'password-help' : undefined} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </label>
              {register ? <p id="password-help" className="auth-field-help">رمز عبور باید بین ۱۲ تا ۱۲۸ کاراکتر باشد.</p> : <button type="button" className="recovery-link" onClick={() => switchView('forgot')}>رمز عبورت رو فراموش کردی؟</button>}
              {error && <p role="alert" className="auth-error">{error}</p>}
              {notice && <p role="status" className="auth-field-help">{notice}</p>}
              <button disabled={busy} className="auth-primary" type="submit">{busy ? 'در حال بررسی…' : register ? 'ساخت حساب کاربری' : 'ورود به حساب'}</button>
            </fieldset>
          </form>
          <div className="auth-divider"><span>یا ادامه با</span></div>
          <GoogleSignIn onCredential={googleLogin} disabled={busy} />
          <p className="auth-switch">{register ? 'قبلاً حساب ساختی؟' : 'هنوز حساب نداری؟'}{' '}<button type="button" disabled={busy} onClick={() => switchView(register ? 'login' : 'register')}>{register ? 'وارد شو' : 'ثبت‌نام کن'}</button></p>
          <p className="auth-security"><ShieldCheck size={13} /> اطلاعات حسابت نزد نکسورا محفوظ است.</p>
        </div>}
        </div>
      </section>
    </dialog>, document.body
  );
}
