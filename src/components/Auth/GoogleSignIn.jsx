import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';

let scriptPromise;
function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client?hl=fa';
    script.async = true;
    const timer = setTimeout(() => { script.remove(); reject(new Error('Google timed out')); }, 15000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Google unavailable')); };
    document.head.appendChild(script);
  }).catch(error => { scriptPromise = undefined; throw error; });
  return scriptPromise;
}

export function GoogleSignIn({ onCredential, disabled }) {
  const container = useRef(null);
  const callback = useRef(onCredential);
  const busy = useRef(disabled);
  callback.current = onCredential;
  busy.current = disabled;
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const { googleClientId } = await api('/auth/providers');
      if (cancelled) return;
      if (!googleClientId) { setStatus('unconfigured'); return; }
      await loadGoogle();
      if (cancelled) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, auto_select: false,
        callback: response => { if (!cancelled && !busy.current) callback.current(response.credential); } });
      window.google.accounts.id.renderButton(container.current, {
        theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'fa', width: Math.min(360, container.current.clientWidth),
      });
      setStatus('ready');
    })().catch(() => { if (!cancelled) setStatus('failed'); });
    return () => { cancelled = true; };
  }, [attempt]);

  return <div className="auth-google">
    <div ref={container} className="auth-google-button" inert={disabled} />
    {status !== 'ready' && <>
      <button type="button" className="auth-google-fallback" disabled={status !== 'failed' || disabled} onClick={() => setAttempt(attempt + 1)}>
        <span className="auth-google-letter" aria-hidden="true">G</span>{status === 'loading' ? 'در حال آماده‌سازی گوگل…' : status === 'failed' ? 'تلاش دوباره برای اتصال به گوگل' : 'ادامه با گوگل'}
      </button>
      {status === 'unconfigured' && <p className="auth-field-help">ورود با گوگل به‌زودی فعال می‌شود. فعلاً با ایمیل ادامه بده.</p>}
      {status === 'failed' && <p role="status" className="auth-field-help">اتصال برقرار نشد. دوباره تلاش کن یا با ایمیل وارد شو.</p>}
    </>}
  </div>;
}
