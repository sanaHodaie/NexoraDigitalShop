import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminApi, ApiError, normalizeApiUrl } from '../api/client';
import type { Manager } from '../api/types';
import { vault } from './vault';

type State = { api: AdminApi; manager: Manager | null; ready: boolean; restoreError: string;
  notice: string; can: (permission: string) => boolean; restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>;
  token: string | null; baseUrl: string };
const Context = createContext<State | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: {
    queries: { staleTime: 20_000, retry: (count, error) => count < 1 && error instanceof ApiError && error.status >= 500 },
    mutations: { retry: false },
  } }));
  const baseUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000', __DEV__);
  const [token, setToken] = useState<string | null>(null);
  const currentToken = useRef<string | null>(null);
  const [manager, setManager] = useState<Manager | null>(null);
  const [ready, setReady] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [notice, setNotice] = useState('');
  const clear = useCallback(async () => {
    setReady(false);
    currentToken.current = null;
    setToken(null); setManager(null);
    try {
      await queryClient.cancelQueries(); queryClient.clear();
      await vault.clear();
    } finally { setReady(true); }
  }, [queryClient]);
  const api = useMemo(() => new AdminApi(baseUrl, token, () => {
    if (currentToken.current === token) {
      setNotice('نشست شما منقضی یا لغو شده است؛ دوباره وارد شوید.');
      void clear().catch(() => setRestoreError('پاک‌کردن نشست دستگاه ممکن نشد؛ دوباره تلاش کنید.'));
    }
  }), [baseUrl, token, clear]);
  const restore = useCallback(async () => {
    setReady(false); setRestoreError('');
    try {
      const saved = await vault.read(baseUrl);
      if (saved) {
        const profile = await new AdminApi(baseUrl, saved).request<Manager>('/api/mobile/session');
        currentToken.current = saved; setToken(saved); setManager(profile);
      }
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        await clear(); setNotice('نشست معتبر نیست یا دسترسی مدیریت لغو شده است.');
      } else setRestoreError(error instanceof Error ? error.message : 'بازیابی نشست موفق نبود.');
    } finally { setReady(true); }
  }, [baseUrl, clear]);
  useEffect(() => { void restore(); }, [restore]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', state => focusManager.setFocused(state === 'active'));
    return () => subscription.remove();
  }, []);
  const login = async (email: string, password: string) => {
    const result = await new AdminApi(baseUrl, null).request<{ token: string; manager: Manager }>('/api/mobile/session', {
      method: 'POST', body: { email: email.trim().toLowerCase(), password },
    });
    try { await vault.save(baseUrl, result.token); }
    catch {
      await new AdminApi(baseUrl, result.token).request('/api/mobile/session', { method: 'DELETE' }).catch(() => {});
      throw new Error('ذخیرهٔ امن نشست ممکن نشد؛ دوباره تلاش کنید.');
    }
    queryClient.clear(); currentToken.current = result.token;
    setNotice(''); setRestoreError(''); setToken(result.token); setManager(result.manager);
  };
  const logout = async () => {
    let failed = false;
    try { await api.request('/api/mobile/session', { method: 'DELETE' }); }
    catch { failed = true; }
    await clear(); setRestoreError('');
    setNotice(failed ? 'از این دستگاه خارج شدید؛ لغو نشست در سرور تأیید نشد. برای لغو همهٔ نشست‌ها از مدیریت حساب استفاده کنید.' : 'با موفقیت خارج شدید.');
  };
  return <QueryClientProvider client={queryClient}><Context.Provider value={{ api, token, baseUrl, manager,
    ready, restoreError, notice, restore, login, logout, can: p => !!manager?.permissions.includes(p) }}>
    {children}
  </Context.Provider></QueryClientProvider>;
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('SessionProvider missing');
  return value;
}
