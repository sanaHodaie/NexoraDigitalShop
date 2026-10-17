export const CATALOG_CATEGORIES = {
  more: {
    title: 'سایر دسته‌ها', english: 'MORE TO EXPLORE',
    description: 'برای ساختن، متصل‌شدن و کشف‌کردن؛ از تجهیزات شبکه تا ابزارهای کار و خلاقیت.',
    image: '/assets/category-heroes/more.webp', fallbackImage: '/assets/products/extra-01.webp',
    productIds: Array.from({ length: 10 }, (_, index) => `extra-${String(index + 1).padStart(2, '0')}`),
  },
  drones: {
    title: 'پهپاد و کوادکوپتر',
    english: 'DRONES & QUADCOPTERS',
    description: 'دنیا را از زاویه‌ای تازه ببین؛ پهپادهای دوربین‌دار برای ثبت منظره‌ها، سفر و تجربهٔ پرواز.',
    image: '/assets/category-heroes/drones.webp',
    fallbackImage: '/assets/products/drone-01.svg',
    productIds: Array.from({ length: 9 }, (_, index) => `drone-${String(index + 1).padStart(2, '0')}`),
  },
  cameras: {
    title: 'دوربین و لنز',
    english: 'CAMERAS & LENSES',
    description: 'لحظه‌ها را از نگاه خودت ثبت کن؛ دوربین‌ها و لنزهای منتخب برای عکاسی، سفر و ساختن روایت‌های تازه.',
    image: '/assets/category-heroes/cameras.webp',
    fallbackImage: '/assets/products/camera-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `camera-${String(index + 1).padStart(2, '0')}`),
  },
  accessories: {
    title: 'لوازم جانبی',
    english: 'TECH ACCESSORIES',
    description: 'جزئیات کوچک، تجربه‌ای بهتر؛ از شارژ و اتصال تا ابزارهای کاربردی میز کار و همراه‌های روزانه.',
    image: '/assets/category-heroes/accessories.webp',
    fallbackImage: '/assets/products/accessory-10.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `accessory-${String(index + 1).padStart(2, '0')}`),
  },
  wearables: {
    title: 'پوشیدنی‌ها',
    english: 'WATCHES & WEARABLES',
    description: 'همراه سبک روزهای پرتحرک تو؛ ساعت‌های هوشمند و مچ‌بندهایی برای ارتباط، ورزش و برنامه‌های روزانه.',
    image: '/assets/category-heroes/wearables.webp',
    fallbackImage: '/assets/products/watch-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `watch-${String(index + 1).padStart(2, '0')}`),
  },
  'smart-home': {
    title: 'خانه هوشمند',
    english: 'SMART HOME',
    description: 'خانه‌ای هماهنگ با زندگی تو؛ روشنایی، امنیت و کنترل وسایل، در یک تجربهٔ ساده و هوشمند.',
    image: '/assets/category-heroes/smart-home.webp',
    fallbackImage: '/assets/products/home-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `home-${String(index + 1).padStart(2, '0')}`),
  },
  audio: {
    title: 'تجهیزات صوتی',
    english: 'AUDIO & SOUND',
    description: 'صدای دلخواهت را پیدا کن؛ از هدفون و هندزفری روزمره تا اسپیکر همراه لحظه‌هایت.',
    image: '/assets/category-heroes/audio.webp',
    fallbackImage: '/assets/products/audio-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `audio-${String(index + 1).padStart(2, '0')}`),
  },
  smartphones: {
    title: 'گوشی هوشمند',
    english: 'SMARTPHONES',
    description: 'همراهی برای هر روز؛ از ثبت لحظه‌ها تا تجربه‌ای روان در کار و بازی.',
    image: '/assets/category-heroes/smartphones.webp',
    fallbackImage: '/assets/products/phone-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `phone-${String(index + 1).padStart(2, '0')}`),
  },
  laptops: {
    title: 'لپ‌تاپ و پی‌سی',
    english: 'LAPTOPS & COMPUTERS',
    description: 'فضای کار خودت را بساز؛ انتخاب‌هایی برای یادگیری، طراحی و بازی.',
    image: '/assets/category-heroes/laptops.webp',
    fallbackImage: '/assets/products/computer-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `computer-${String(index + 1).padStart(2, '0')}`),
  },
  gaming: {
    title: 'گیمینگ و کنسول',
    english: 'GAMING & CONSOLES',
    description: 'آمادهٔ بازی بعدی؛ کنسول، کنترلر و تجهیزات منتخب برای دنیای بازی تو.',
    image: '/assets/category-heroes/gaming.webp',
    fallbackImage: '/assets/products/gaming-01.svg',
    productIds: Array.from({ length: 10 }, (_, index) => `gaming-${String(index + 1).padStart(2, '0')}`),
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
