export const CATALOG_CATEGORIES = {
  audio: {
    title: 'تجهیزات صوتی',
    english: 'AUDIO & SOUND',
    description: 'صدای دلخواهت را پیدا کن؛ از هدفون و هندزفری روزمره تا اسپیکر همراه لحظه‌هایت.',
    image: '/assets/products/audio-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `audio-${String(index + 1).padStart(2, '0')}`),
  },
  smartphones: {
    title: 'گوشی هوشمند',
    english: 'SMARTPHONES',
    description: 'همراهی برای هر روز؛ از ثبت لحظه‌ها تا تجربه‌ای روان در کار و بازی.',
    image: '/assets/products/phone-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `phone-${String(index + 1).padStart(2, '0')}`),
  },
  laptops: {
    title: 'لپ‌تاپ و پی‌سی',
    english: 'LAPTOPS & COMPUTERS',
    description: 'فضای کار خودت را بساز؛ انتخاب‌هایی برای یادگیری، طراحی و بازی.',
    image: '/assets/products/computer-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `computer-${String(index + 1).padStart(2, '0')}`),
  },
};

export const categoryHref = id => CATALOG_CATEGORIES[id] ? `/category/${id}` : `/#${id}`;

const normalize = value => String(value ?? '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[آأإ]/g, 'ا')
  .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[\s\u200c]+/g, ' ').trim();

export function selectCatalogProducts(products, categoryId, { query = '', brand = '', sort = 'featured', available = false } = {}) {
  const category = CATALOG_CATEGORIES[categoryId];
  if (!category) return [];
  const term = normalize(query);
  const selected = products.filter(product => category.productIds.includes(product.id) && product.category === categoryId
    && (!brand || product.brand === brand) && (!available || product.inStock)
    && (!term || normalize(`${product.name} ${product.nameEn} ${(product.specs || []).join(' ')}`).includes(term)));
  return selected.sort((a, b) => sort === 'price-asc' ? a.price - b.price
    : sort === 'price-desc' ? b.price - a.price
      : category.productIds.indexOf(a.id) - category.productIds.indexOf(b.id));
}
