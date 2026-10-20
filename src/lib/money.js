// Keep the storefront and management UI on the same existing catalogue rate.
export const RIAL_RATE = 600000;
export const toRial = amount => Math.round(Number(amount || 0) * RIAL_RATE);
export const formatPrice = amount => `${toRial(amount).toLocaleString('en-US').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])} ریال`;
