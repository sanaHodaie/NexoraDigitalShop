import React, { useState } from 'react';
import { PasswordRecovery } from '../components/Auth/PasswordRecovery';
import { useShop } from '../context/ShopContext';
import { navigate } from '../navigation';
import '../components/Auth/auth.css';

export default function ResetPasswordPage() {
  const { setIsAuthOpen } = useShop();
  const [token] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    // Keep the secret only in memory, outside browser history and referrers.
    return value;
  });
  React.useEffect(() => { window.history.replaceState(null, '', window.location.pathname); }, []);
  const login = () => { navigate('/account'); setIsAuthOpen(true); };
  return <section className="reset-page" dir="rtl"><div className="auth-form-card">
    {/^[A-Za-z0-9_-]{43,128}$/.test(token) ? <PasswordRecovery token={token} onLogin={login} /> : <><h1>لینک بازیابی معتبر نیست</h1><p>از بخش «فراموشی رمز عبور» در فرم ورود، لینک جدیدی درخواست کنید.</p><button className="auth-primary" onClick={login}>رفتن به فرم ورود</button></>}
  </div></section>;
}
