// Mock and Seed Data for Zarrin Gold & Jewelry Admin Panel

export const INITIAL_GOLD_RATES = [
  {
    id: 'gold_18k',
    name: 'طلای ۱۸ عیار (۷۵۰)',
    category: 'gold',
    price: 3685000,
    change: 1.45,
    changeAmount: 52000,
    unit: 'گرم',
    high24h: 3710000,
    low24h: 3620000,
    updatedAt: 'همین الان',
    isPrimary: true
  },
  {
    id: 'gold_24k',
    name: 'طلای ۲۴ عیار (شمش خالص ۹۹۹)',
    category: 'gold',
    price: 4913000,
    change: 1.48,
    changeAmount: 71000,
    unit: 'گرم',
    high24h: 4945000,
    low24h: 4830000,
    updatedAt: 'همین الان',
    isPrimary: true
  },
  {
    id: 'gold_mesghal',
    name: 'مثقال طلا (مظنه بازار تهران)',
    category: 'gold',
    price: 15965000,
    change: 1.42,
    changeAmount: 224000,
    unit: 'مثقال (۴.۶۰۸ گرم)',
    high24h: 16080000,
    low24h: 15720000,
    updatedAt: 'همین الان',
    isPrimary: true
  },
  {
    id: 'coin_emami',
    name: 'سکه تمام طرح جدید (امامی)',
    category: 'coin',
    price: 43850000,
    change: 0.92,
    changeAmount: 400000,
    bubble: 7850000,
    bubblePercent: 17.9,
    weight: 8.133,
    carat: 21.6,
    updatedAt: 'همین الان',
    isPrimary: true
  },
  {
    id: 'coin_bahar',
    name: 'سکه تمام بهار آزادی (طرح قدیم)',
    category: 'coin',
    price: 39900000,
    change: 0.75,
    changeAmount: 300000,
    bubble: 3950000,
    bubblePercent: 9.8,
    weight: 8.133,
    carat: 21.6,
    updatedAt: 'همین الان'
  },
  {
    id: 'coin_half',
    name: 'نیم سکه بهار آزادی',
    category: 'coin',
    price: 23600000,
    change: -0.42,
    changeAmount: -100000,
    bubble: 5600000,
    bubblePercent: 23.7,
    weight: 4.066,
    carat: 21.6,
    updatedAt: 'همین الان',
    isPrimary: true
  },
  {
    id: 'coin_quarter',
    name: 'ربع سکه بهار آزادی',
    category: 'coin',
    price: 15400000,
    change: 0.65,
    changeAmount: 100000,
    bubble: 6400000,
    bubblePercent: 41.5,
    weight: 2.033,
    carat: 21.6,
    updatedAt: 'همین الان'
  },
  {
    id: 'coin_gerami',
    name: 'سکه یک گرمی بانکی',
    category: 'coin',
    price: 7100000,
    change: 0.0,
    changeAmount: 0,
    bubble: 2900000,
    bubblePercent: 40.8,
    weight: 1.01,
    carat: 21.6,
    updatedAt: 'همین الان'
  },
  {
    id: 'bar_1oz',
    name: 'شمش طلا ۱ اونسی سوئیسی (PAMP)',
    category: 'bar',
    price: 153500000,
    change: 1.55,
    changeAmount: 2350000,
    weight: 31.103,
    carat: 24,
    updatedAt: 'همین الان',
    isPrimary: true
  },
  {
    id: 'bar_10g',
    name: 'شمش طلا ۱۰ گرمی زرین (۹۹۹.۹)',
    category: 'bar',
    price: 49450000,
    change: 1.48,
    changeAmount: 720000,
    weight: 10.0,
    carat: 24,
    updatedAt: 'همین الان'
  },
  {
    id: 'bar_100g',
    name: 'شمش طلا ۱۰۰ گرمی ایران شمش',
    category: 'bar',
    price: 492000000,
    change: 1.47,
    changeAmount: 7100000,
    weight: 100.0,
    carat: 24,
    updatedAt: 'همین الان'
  },
  {
    id: 'silver_999',
    name: 'نقره خام ساچمه‌ای (عیار ۹۹۹)',
    category: 'silver',
    price: 64500,
    change: 2.15,
    changeAmount: 1350,
    unit: 'گرم',
    updatedAt: 'همین الان',
    isPrimary: true
  },
  {
    id: 'silver_bar_1kg',
    name: 'شمش ۱ کیلوگرمی نقره فاخر',
    category: 'silver',
    price: 65800000,
    change: 2.1,
    changeAmount: 1350000,
    unit: 'کیلوگرم',
    updatedAt: 'همین الان'
  },
  {
    id: 'platinum',
    name: 'پلاتین خالص (PT 995)',
    category: 'metal',
    price: 2180000,
    change: -0.35,
    changeAmount: -7600,
    unit: 'گرم',
    updatedAt: 'همین الان'
  },
  {
    id: 'global_gold_ounce',
    name: 'انس جهانی طلا (XAU/USD)',
    category: 'global',
    price: 2435.8,
    change: 0.62,
    changeAmount: 15.1,
    unit: 'دلار',
    updatedAt: 'همین الان',
    isPrimary: true
  },
  {
    id: 'global_silver_ounce',
    name: 'انس جهانی نقره (XAG/USD)',
    category: 'global',
    price: 29.45,
    change: 1.25,
    changeAmount: 0.36,
    unit: 'دلار',
    updatedAt: 'همین الان'
  }
];

export const INITIAL_PRODUCTS = [
  {
    id: 'PRD-101',
    name: 'گردنبند طرح پروانه ون کلیف با صدف طبیعی',
    category: 'necklace',
    categoryName: 'گردنبند',
    weight: 6.42, // grams
    carat: 18,
    ojratPercent: 16, // 16% ojrat
    stoneType: 'صدف طبیعی و برلیان',
    stonePrice: 3200000,
    stock: 5,
    sku: 'ZRN-NC-481',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80',
    salesCount: 38,
    description: 'گردنبند ظریف و دست‌ساز پروانه با سنگ صدف ارگانیک و قاب طلای ۱۸ عیار رزگلد',
    isFeatured: true
  },
  {
    id: 'PRD-102',
    name: 'انگشتر سولیتر الماس برلیان تراش پرنسس',
    category: 'ring',
    categoryName: 'انگشتر',
    weight: 4.85,
    carat: 18,
    ojratPercent: 18,
    stoneType: 'الماس برلیان ۰.۴۵ قیراط VVS1',
    stonePrice: 28500000,
    stock: 2,
    sku: 'ZRN-RG-902',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80',
    salesCount: 19,
    description: 'انگشتر نشان نامزدی با الماس شناسنامه‌دار GIA و رکاب طلای زرد براق',
    isFeatured: true
  },
  {
    id: 'PRD-103',
    name: 'دستبند زنجیری کارتیه لاو (Cartier Love)',
    category: 'bracelet',
    categoryName: 'دستبند',
    weight: 12.65,
    carat: 18,
    ojratPercent: 12,
    stoneType: 'بدون سنگ',
    stonePrice: 0,
    stock: 8,
    sku: 'ZRN-BR-214',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1611591475878-a00632a67e45?w=600&auto=format&fit=crop&q=80',
    salesCount: 64,
    description: 'دستبند کلاسیک و محبوب کارتیه با قفل فابریک پیچ‌دار و استحکام فوق‌العاده',
    isFeatured: true
  },
  {
    id: 'PRD-104',
    name: 'گوشواره آویز فانتزی یاقوت کبود اشکی',
    category: 'earrings',
    categoryName: 'گوشواره',
    weight: 5.2,
    carat: 18,
    ojratPercent: 15,
    stoneType: 'یاقوت کبود آفریقایی و برلیان',
    stonePrice: 9400000,
    stock: 4,
    sku: 'ZRN-ER-553',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&auto=format&fit=crop&q=80',
    salesCount: 27,
    description: 'گوشواره مجلسی فاخر با درخشش خیره‌کننده یاقوت طبیعی و نگین‌های اتمی اتریشی',
    isFeatured: false
  },
  {
    id: 'PRD-105',
    name: 'سرویس کامل طلا فیوژن ورساچه (تراش لیزری)',
    category: 'set',
    categoryName: 'سرویس طلا',
    weight: 28.9,
    carat: 18,
    ojratPercent: 14,
    stoneType: 'بدون سنگ (نما برلیان)',
    stonePrice: 0,
    stock: 1,
    sku: 'ZRN-ST-881',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop&q=80',
    salesCount: 11,
    description: 'شامل گردنبند، دستبند و گوشواره؛ بدون نگین و با درخشش تراش مدرن مناسب عروس',
    isFeatured: true
  },
  {
    id: 'PRD-106',
    name: 'شمش سرمایه‌گذاری طلا ۵۰ گرمی ونک (۹۹۹.۹)',
    category: 'bar',
    categoryName: 'شمش سرمایه‌گذاری',
    weight: 50.0,
    carat: 24,
    ojratPercent: 2.5,
    stoneType: 'بدون سنگ',
    stonePrice: 0,
    stock: 12,
    sku: 'ZRN-BR-50G',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=600&auto=format&fit=crop&q=80',
    salesCount: 85,
    description: 'شمش خالص با هولوگرام ضد جعل اتحادیه طلا و جواهر و بسته‌بندی امنیتی وکیوم',
    isFeatured: true
  },
  {
    id: 'PRD-107',
    name: 'پابند زنجیری دولاین چشم‌نظر طلا',
    category: 'anklet',
    categoryName: 'پابند',
    weight: 3.15,
    carat: 18,
    ojratPercent: 17,
    stoneType: 'مهره صدف چشم‌نظر میناکاری',
    stonePrice: 850000,
    stock: 0,
    sku: 'ZRN-AN-109',
    status: 'out_of_stock',
    image: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=600&auto=format&fit=crop&q=80',
    salesCount: 42,
    description: 'پابند ظریف دخترانه با میناکاری ضد آب و زنجیر فلامینگو مستحکم',
    isFeatured: false
  },
  {
    id: 'PRD-108',
    name: 'النگو طلا داماسکوس شیاری پهن (سایز ۲)',
    category: 'bangle',
    categoryName: 'النگو',
    weight: 9.8,
    carat: 18,
    ojratPercent: 9.5,
    stoneType: 'بدون سنگ',
    stonePrice: 0,
    stock: 6,
    sku: 'ZRN-BG-304',
    status: 'available',
    image: 'https://images.unsplash.com/photo-1611591475878-a00632a67e45?w=600&auto=format&fit=crop&q=80',
    salesCount: 53,
    description: 'النگو مقاوم با طراحی دو رنگ طلای زرد و سفید، بدون گیرکردن به لباس',
    isFeatured: false
  }
];

export const INITIAL_ORDERS = [
  {
    id: 'ORD-9842',
    invoiceNumber: 'ZRN-INV-1405-9842',
    customerName: 'دکتر مهدی کاظمی',
    customerPhone: '۰۹۱۲۳۴۵۶۷۸۹',
    customerNationalCode: '۰۰۱۲۴۵۸۷۹۶',
    date: '۲۷ مرداد ۱۴۰۵ - ۱۱:۳۰',
    status: 'completed',
    statusText: 'تحویل داده شده',
    productName: 'دستبند زنجیری کارتیه لاو',
    goldWeight: 12.65,
    carat: 18,
    goldPriceAtOrder: 3685000, // per gram
    rawGoldTotal: 46615250,
    ojratAmount: 5593830, // 12%
    profitAmount: 3654635, // 7%
    taxAmount: 832361, // 9% on ojrat & profit
    stonePrice: 0,
    finalTotal: 56696076,
    paymentMethod: 'درگاه آنلاین سامان',
    postalCode: '۱۹۸۷۶۵۴۳۲۱',
    shippingAddress: 'تهران، زعفرانیه، خیابان مقدس اردبیلی، پلاک ۴۴، واحد ۸'
  },
  {
    id: 'ORD-9841',
    invoiceNumber: 'ZRN-INV-1405-9841',
    customerName: 'سارا میرزایی',
    customerPhone: '۰۹۳۵۹۸۷۶۵۴۳',
    customerNationalCode: '۰۴۵۶۳۲۱۷۸۹',
    date: '۲۷ مرداد ۱۴۰۵ - ۰۹:۱۵',
    status: 'processing',
    statusText: 'در حال ساخت در کارگاه',
    productName: 'انگشتر سولیتر الماس برلیان',
    goldWeight: 4.85,
    carat: 18,
    goldPriceAtOrder: 3670000,
    rawGoldTotal: 17799500,
    ojratAmount: 3203910,
    profitAmount: 1470238,
    taxAmount: 420673,
    stonePrice: 28500000,
    finalTotal: 51394321,
    paymentMethod: 'کارت به کارت / حواله ساتنا',
    postalCode: '۸۱۴۵۶۹۸۷۱۲',
    shippingAddress: 'اصفهان، خیابان نظر شرقی، مجتمع زاینده‌رود'
  },
  {
    id: 'ORD-9840',
    invoiceNumber: 'ZRN-INV-1405-9840',
    customerName: 'امیرحسین پارسا',
    customerPhone: '۰۹۱۵۱۲۳۴۵۶۷',
    customerNationalCode: '۰۹۴۵۶۱۲۳۴۵',
    date: '۲۶ مرداد ۱۴۰۵ - ۱۹:۴۰',
    status: 'shipped',
    statusText: 'ارسال شده با بیمه ارزش بالا',
    productName: 'شمش سرمایه‌گذاری طلا ۵۰ گرمی ونک',
    goldWeight: 50.0,
    carat: 24,
    goldPriceAtOrder: 4910000,
    rawGoldTotal: 245500000,
    ojratAmount: 6137500,
    profitAmount: 0,
    taxAmount: 552375,
    stonePrice: 0,
    finalTotal: 252189875,
    paymentMethod: 'درگاه پرداخت شاپرک',
    postalCode: '۹۱۷۸۹۶۵۴۱۲',
    shippingAddress: 'مشهد، بلوار سجاد، خیابان بهار، برج سرمایه'
  },
  {
    id: 'ORD-9839',
    invoiceNumber: 'ZRN-INV-1405-9839',
    customerName: 'پریسا درخشانی',
    customerPhone: '۰۹۱۹۴۴۵۵۶۶۷',
    customerNationalCode: '۰۳۱۵۴۶۹۸۷۴',
    date: '۲۶ مرداد ۱۴۰۵ - ۱۴:۱۰',
    status: 'completed',
    statusText: 'تحویل حضوری در شعبه بازار',
    productName: 'گردنبند طرح پروانه ون کلیف',
    goldWeight: 6.42,
    carat: 18,
    goldPriceAtOrder: 3660000,
    rawGoldTotal: 23497200,
    ojratAmount: 3759552,
    profitAmount: 1907972,
    taxAmount: 510077,
    stonePrice: 3200000,
    finalTotal: 32874801,
    paymentMethod: 'کارتخوان POS شعبه مرکزی',
    postalCode: '۱۱۱۱۱۱۱۱۱۱',
    shippingAddress: 'تحویل حضوری در ویترین VIP شعبه بازار بزرگ طلا'
  }
];

export const INITIAL_MESSAGES = [
  {
    id: 'MSG-301',
    customerName: 'رویا تاج‌بخش',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '۰۹۱۲۹۹۸۸۷۷۶',
    unread: true,
    lastMessage: 'سلام وقت بخیر، امکان سفارش سرویس ورساچه با طلای ۲۴ عیار وجود داره؟',
    time: '۵ دقیقه پیش',
    status: 'open',
    tags: ['سفارش ساخت اختصاصی', 'VIP'],
    chatHistory: [
      { sender: 'customer', text: 'سلام و عرض ادب، روزتون بخیر', time: '۱۰:۲۵' },
      { sender: 'customer', text: 'من عکس سرویس ورساچه رو در سایت دیدم، بسیار زیباست.', time: '۱۰:۲۶' },
      { sender: 'admin', text: 'سلام سرکار خانم تاج‌بخش گرامی، در خدمت شما هستیم. بله این سرویس جزو کارهای لوکس و دست‌اول گالری ماست.', time: '۱۰:۲۸' },
      { sender: 'customer', text: 'امکان سفارش سرویس ورساچه با طلای ۲۴ عیار وجود داره یا فقط ۱۸ عیار تولید میشه؟', time: '۱۰:۳۱' }
    ]
  },
  {
    id: 'MSG-302',
    customerName: 'مهندس آرش صادقی',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    phone: '۰۹۳۰۵۵۵۴۴۳۳',
    unread: true,
    lastMessage: 'شمش‌های ۵۰ گرمی پلمپ شرکت با فاکتور رسمی هولوگرام‌دار تحویل میشه؟',
    time: '۲۸ دقیقه پیش',
    status: 'open',
    tags: ['استعلام شمش', 'سرمایه‌گذاری'],
    chatHistory: [
      { sender: 'customer', text: 'سلام، می‌خواستم بدونم شمش‌های ۵۰ گرمی پلمپ شرکت با فاکتور رسمی هولوگرام‌دار تحویل میشه؟', time: '۱۰:۰۵' }
    ]
  },
  {
    id: 'MSG-303',
    customerName: 'مینا رادمنش',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    phone: '۰۹۱۸۱۱۱۲۲۳۳',
    unread: false,
    lastMessage: 'کد رهگیری پستی به دستم رسید، ممنون از بسته‌بندی عالی و هدیه همراهش.',
    time: '۲ ساعت پیش',
    status: 'resolved',
    tags: ['رضایت مشتری', 'ارسال'],
    chatHistory: [
      { sender: 'admin', text: 'سلام سرکار خانم رادمنش، بسته شما با بیمه پست ویژه ارسال شد. کد رهگیری: ۲۹۸۴۷۱۲۹۳۸۴۷', time: '۰۸:۴۵' },
      { sender: 'customer', text: 'کد رهگیری پستی به دستم رسید، ممنون از بسته‌بندی عالی و هدیه همراهش.', time: '۰۹:۱۵' }
    ]
  },
  {
    id: 'MSG-304',
    customerName: 'علیرضا فرهمند',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    phone: '۰۹۱۲۷۷۷۸۸۹۹',
    unread: false,
    lastMessage: 'اجرت انگشتر سولیتر چقدر تخفیف داره برای اعضای باشگاه پلاتینیوم؟',
    time: 'دیروز',
    status: 'in_progress',
    tags: ['تخفیف', 'باشگاه مشتریان'],
    chatHistory: [
      { sender: 'customer', text: 'سلام، اجرت انگشتر سولیتر چقدر تخفیف داره برای اعضای باشگاه پلاتینیوم؟', time: 'دیروز ۱۶:۲۰' },
      { sender: 'admin', text: 'سلام جناب فرهمند عزیز، به عنوان عضو پلاتینیوم ۳٪ از اجرت ساخت کسر و یک سال بیمه نگین رایگان تقدیم می‌شود.', time: 'دیروز ۱۶:۳۰' }
    ]
  }
];

export const INITIAL_CUSTOMERS = [
  {
    id: 'CST-501',
    name: 'دکتر مهدی کاظمی',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    tier: 'diamond',
    tierName: 'الماس VIP',
    totalPurchases: 428000000,
    goldTurnoverGrams: 88.45,
    goldWalletBalance: 15.25, // grams
    ordersCount: 9,
    joinedDate: 'فروردین ۱۴۰۳',
    avatarColor: 'from-purple-500 to-pink-500'
  },
  {
    id: 'CST-502',
    name: 'سارا میرزایی',
    phone: '۰۹۳۵۹۸۷۶۵۴۳',
    tier: 'platinum',
    tierName: 'پلاتینیوم',
    totalPurchases: 185000000,
    goldTurnoverGrams: 42.1,
    goldWalletBalance: 4.8,
    ordersCount: 4,
    joinedDate: 'شهریور ۱۴۰۳',
    avatarColor: 'from-fuchsia-500 to-rose-500'
  },
  {
    id: 'CST-503',
    name: 'امیرحسین پارسا',
    phone: '۰۹۱۵۱۲۳۴۵۶۷',
    tier: 'gold',
    tierName: 'طلایی',
    totalPurchases: 295000000,
    goldTurnoverGrams: 65.0,
    goldWalletBalance: 0,
    ordersCount: 3,
    joinedDate: 'آبان ۱۴۰۳',
    avatarColor: 'from-amber-500 to-orange-500'
  },
  {
    id: 'CST-504',
    name: 'رویا تاج‌بخش',
    phone: '۰۹۱۲۹۹۸۸۷۷۶',
    tier: 'diamond',
    tierName: 'الماس VIP',
    totalPurchases: 560000000,
    goldTurnoverGrams: 114.2,
    goldWalletBalance: 28.6,
    ordersCount: 12,
    joinedDate: 'اردیبهشت ۱۴۰۲',
    avatarColor: 'from-violet-600 to-purple-400'
  }
];

export const CHART_REVENUE_DATA = [
  { day: 'شنبه', revenue: 42000000, goldGrams: 11.4, profit: 5400000 },
  { day: 'یکشنبه', revenue: 58000000, goldGrams: 15.8, profit: 7200000 },
  { day: 'دوشنبه', revenue: 84000000, goldGrams: 22.8, profit: 10800000 },
  { day: 'سه‌شنبه', revenue: 69000000, goldGrams: 18.7, profit: 8900000 },
  { day: 'چهارشنبه', revenue: 112000000, goldGrams: 30.4, profit: 14500000 },
  { day: 'پنج‌شنبه', revenue: 148000000, goldGrams: 40.2, profit: 19200000 },
  { day: 'جمعه', revenue: 92000000, goldGrams: 24.9, profit: 11800000 }
];

export const CHART_CATEGORY_SHARE = [
  { name: 'گردنبند و مدال', value: 32, color: '#a855f7' },
  { name: 'دستبند و النگو', value: 26, color: '#ec4899' },
  { name: 'انگشتر و حلقه', value: 20, color: '#f43f5e' },
  { name: 'شمش و مسکوکات', value: 14, color: '#eab308' },
  { name: 'گوشواره و پابند', value: 8, color: '#8b5cf6' }
];

export const GOLD_HISTORICAL_CHART = [
  { time: '۰۹:۰۰', price: 3640000 },
  { time: '۱۰:۰۰', price: 3652000 },
  { time: '۱۱:۰۰', price: 3671000 },
  { time: '۱۲:۰۰', price: 3665000 },
  { time: '۱۳:۰۰', price: 3680000 },
  { time: '۱۴:۰۰', price: 3678000 },
  { time: '۱۵:۰۰', price: 3685000 },
  { time: '۱۶:۰۰', price: 3692000 },
  { time: '۱۷:۰۰', price: 3685000 }
];
