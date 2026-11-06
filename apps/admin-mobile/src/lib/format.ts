export const statusLabels: Record<string, string> = {
  new: 'جدید', reviewing: 'در حال بررسی', contacted: 'تماس گرفته شد', quoted: 'قیمت ارائه شد',
  closed: 'بسته شده', cancelled: 'لغو شده', approved: 'تأیید شده', paid: 'پرداخت شده',
  draft: 'پیش‌نویس', pending: 'در انتظار', pending_payment: 'در انتظار پرداخت', expired: 'منقضی شده',
};
export const deliveryLabels = { none: 'فاکتور صادر نشده', pending: 'در صف ارسال', sent: 'ارسال شده', failed: 'ارسال ناموفق' };
export const number = (n: number | bigint) => new Intl.NumberFormat('fa-IR').format(n);
export const rial = (n: number | string | bigint) => {
  try { return number(typeof n === 'string' ? BigInt(n) : n) + ' ریال'; } catch { return '—'; }
};
// Preserve the catalogue's existing price unit. Wholesale prices already use rial.
export const catalogueRial = (amount: number) => rial(Math.round(amount * 600000));
export function date(value: string | number): string {
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(value)); }
  catch { return '—'; }
}
export function digits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.includes(c)
    ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(c) : '٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
}
