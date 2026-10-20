// Persian Numbers & Financial Formatters

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(num) {
  if (num === null || num === undefined) return '';
  return String(num).replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

export function formatToman(amount, includeUnit = true) {
  if (amount === null || amount === undefined) return '۰ دلار';
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const persianFormatted = toPersianDigits(formatted);
  return includeUnit ? `${persianFormatted} دلار` : persianFormatted;
}

export function formatGoldWeight(grams, includeUnit = true) {
  if (grams === null || grams === undefined) return '۰ گرم';
  const val = Number(grams).toFixed(3);
  const persian = toPersianDigits(val);
  return includeUnit ? `${persian} گرم` : persian;
}

export function formatPercent(val) {
  if (val === null || val === undefined) return '۰٪';
  const isPositive = Number(val) >= 0;
  const absVal = Math.abs(Number(val)).toFixed(1);
  return `${isPositive ? '+' : '-'}${toPersianDigits(absVal)}٪`;
}

export function getTodayJalali() {
  // Current Persian Date
  return new Intl.DateTimeFormat('fa-IR', {dateStyle:'full',timeZone:'Asia/Tehran'}).format(new Date());
}

export function formatPersianTime(date = new Date()) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return toPersianDigits(`${h}:${m}:${s}`);
}
