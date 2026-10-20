import { HERO_IMAGE, FEATURED_COLLECTIONS, TRENDING_PRODUCTS, RECOMMENDED_PRODUCTS, FLASH_DEALS } from './mockData.js';
export const HOME_DEFAULTS = {
  hero: { title: 'نسل جدید الکترونیک.', accent: 'امکانات بی‌پایان.',
    description: 'آینده فناوری همین‌جاست. هوشمندانه‌تر کار کنید، با شفافیت بشنوید و با جدیدترین شاهکارهای دیجیتال نکسورا دنیای خود را ارتقا دهید.', image: HERO_IMAGE },
  collections: FEATURED_COLLECTIONS,
  trendingIds: TRENDING_PRODUCTS.map(p => p.id),
  recommendedIds: RECOMMENDED_PRODUCTS.map(p => p.id),
  dealIds: FLASH_DEALS.map(p => p.id),
};
export const SETTINGS_DEFAULTS = { storeName: 'نکسورا', description: 'فروشگاه تجهیزات دیجیتال نکسورا', supportEmail: '', supportPhone: '' };
