export class ApiError extends Error {
  constructor(message: string, public status = 0, public code = '') { super(message); }
}

export function normalizeApiUrl(raw: string, development = false): string {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { throw new Error('آدرس API معتبر نیست؛ فایل .env اپ را بررسی کنید.'); }
  const host = url.hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2'
    || /^10\.\d+\.\d+\.\d+$/.test(host) || /^192\.168\.\d+\.\d+$/.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);
  if ((url.protocol !== 'https:' && !(development && local && url.protocol === 'http:'))
      || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
    throw new Error('API باید آدرس پایهٔ HTTPS باشد؛ HTTP محلی فقط در حالت توسعه مجاز است.');
  }
  return url.origin;
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; signal?: AbortSignal };

export class AdminApi {
  constructor(public baseUrl: string, private token: string | null,
    private expired: () => void = () => {}, private fetcher: typeof fetch = fetch) {}

  async request<T>(path: string, options: Options = {}): Promise<T> {
    if (!path.startsWith('/api/admin/') && path !== '/api/mobile/session' && path !== '/health') {
      throw new Error('مسیر API مدیریتی معتبر نیست.');
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 25_000);
    try {
      // Browser fetch must not be invoked with this AdminApi instance as `this`.
      const fetcher = this.fetcher;
      const response = await fetcher(this.baseUrl + path, {
        method: options.method ?? 'GET', credentials: 'omit', redirect: 'error',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      });
      if (response.status === 204) return undefined as T;
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 && this.token) this.expired();
        let message = typeof json?.error === 'string' ? json.error : 'دریافت اطلاعات موفق نبود؛ دوباره تلاش کنید.';
        if (response.status === 404) message = 'مسیر موردنظر در بک‌اند پیدا نشد؛ نسخه و آدرس بک‌اند را بررسی کنید.';
        if (response.status === 409) message = 'اطلاعات تغییر کرده است. تازه‌سازی کنید و دوباره بررسی کنید.';
        if (response.status === 429) message = 'تعداد تلاش‌ها زیاد است؛ یک دقیقه بعد دوباره تلاش کنید.';
        throw new ApiError(message, response.status, json?.code ?? '');
      }
      if (json === null) throw new ApiError('پاسخ API معتبر نیست؛ آدرس بک‌اند را بررسی کنید.');
      return json as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (options.signal?.aborted) throw error;
      throw new ApiError(controller.signal.aborted
        ? 'پاسخ سرور دیر شد؛ اتصال و روشن‌بودن بک‌اند را بررسی کنید.'
        : 'اتصال به بک‌اند برقرار نشد؛ آدرس API، شبکه و فایروال را بررسی کنید.');
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abort);
    }
  }
}
