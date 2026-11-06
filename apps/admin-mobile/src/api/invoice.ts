import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function shareInvoice(baseUrl: string, token: string, id: number): Promise<void> {
  return downloadFile(baseUrl, token, `/api/admin/customer-requests/${id}/invoice`, `Nexora-${id}.pdf`, 'application/pdf');
}

export async function downloadFile(baseUrl: string, token: string, path: string, filename: string, mime: string): Promise<void> {
  if (!path.startsWith('/api/admin/') || !/^[\w.-]+$/.test(filename)) throw new Error('مسیر دانلود نامعتبر است.');
  const url = baseUrl + path;
  const headers = { Authorization: `Bearer ${token}` };
  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(25_000) });
    if (!response.ok) throw new Error('دریافت فاکتور موفق نبود؛ نشست و دسترسی را تازه‌سازی کنید.');
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = blobUrl; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('اشتراک‌گذاری فایل در این دستگاه در دسترس نیست.');
  if (!FileSystem.cacheDirectory) throw new Error('فضای موقت فایل در دسترس نیست.');
  const directory = FileSystem.cacheDirectory + 'nexora-invoices/';
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const file = directory + Date.now() + '-' + filename;
  try {
    const result = await FileSystem.downloadAsync(url, file, { headers });
    if (result.status !== 200) throw new Error('دریافت فاکتور موفق نبود؛ نشست و دسترسی را تازه‌سازی کنید.');
    await Sharing.shareAsync(file, { mimeType: mime, dialogTitle: 'دریافت فایل نکسورا' });
  } finally { await FileSystem.deleteAsync(file, { idempotent: true }); }
}
