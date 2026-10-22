import { normalizeSearch } from './product-search.js';

export const MAX_COMPARE = 3;
export const comparisonIds = value => Array.isArray(value)
  ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id)))].slice(0, MAX_COMPARE) : [];

export function addComparison(ids, product, catalog) {
  if (ids.includes(product.id)) return { ids, error: '' };
  if (ids.length >= MAX_COMPARE) return { ids, error: 'حداکثر ۳ محصول را می‌توانید مقایسه کنید؛ ابتدا یکی را حذف کنید.' };
  const first = catalog.find(item => ids.includes(item.id));
  if (first && first.category !== product.category) return { ids, error: 'برای مقایسهٔ کاربردی، محصولات یک دسته را انتخاب کنید. برای تغییر دسته، فهرست را پاک کنید.' };
  return { ids: [...ids, product.id], error: '' };
}

const specGroups = [
  ['ram', 'حافظهٔ رم', /(?:^|\s)(?:رم|ram)(?:\s|$)/i],
  ['storage', 'فضای ذخیره‌سازی', /ssd|hdd|حافظه داخلی|ذخیره|^[\d]+\s*(?:گیگابایت|ترابایت|gb|tb)/i],
  ['cpu', 'پردازنده / تراشه', /تراشه|پردازنده|\bcpu\b|intel|ryzen|snapdragon/i],
  ['gpu', 'گرافیک', /گرافیک|\bgpu\b|geforce|rtx|radeon/i],
  ['screen', 'نمایشگر', /نمایشگر|صفحه نمایش|\boled\b|\bretina\b/i],
  ['camera', 'دوربین / حسگر', /دوربین|حسگر|مگاپیکسل|megapixel/i],
  ['lens', 'لنز / مانت', /لنز|مانت|\blens\b/i],
  ['battery', 'باتری / شارژ', /باتری|شارژ|battery/i],
  ['connectivity', 'اتصال', /اتصال|بلوتوث|bluetooth|wi fi|درگاه|\busb\b/i],
  ['noise', 'کنترل صدا', /نویز|شنیدن محیط|\banc\b/i],
  ['design', 'طراحی / بدنه', /طراحی|بدنه/i],
];

export function productSpecGroups(product) {
  const result = {};
  for (const spec of Array.isArray(product.specs) ? product.specs : []) {
    if (typeof spec !== 'string' || !spec.trim()) continue;
    const key = specGroups.find(([, , pattern]) => pattern.test(normalizeSearch(spec)))?.[0] || 'other';
    (result[key] ||= []).push(spec);
  }
  return result;
}

export function comparisonRows(products) {
  const specifications = products.map(productSpecGroups);
  const rows = [
    { key: 'brand', label: 'برند', values: products.map(product => product.brand || '') },
    { key: 'kind', label: 'نوع محصول', values: products.map(product => product.kindLabel || '') },
    ...[...specGroups, ['other', 'سایر مشخصات ثبت‌شده']].map(([key, label]) => ({
      key, label, values: specifications.map(specs => (specs[key] || []).join(' · ')),
    })),
  ];
  return rows.filter(row => row.values.some(Boolean)).map(row => ({
    ...row, different: new Set(row.values.map(normalizeSearch)).size > 1,
  }));
}
