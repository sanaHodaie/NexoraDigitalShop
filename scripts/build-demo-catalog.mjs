// Reproducible, self-hosted demo catalogue. Prices/configurations are examples,
// not live offers. The original SVG illustrations are not manufacturer photos.
import { mkdir, writeFile } from 'node:fs/promises';

const phones = [
  ['اپل آیفون ۱۵', 'Apple iPhone 15', 'Apple', 799, '۱۲۸ گیگابایت', 'تراشه A16 Bionic', 'دوربین ۴۸ مگاپیکسل', '#a4d5dc'],
  ['اپل آیفون ۱۵ پلاس', 'Apple iPhone 15 Plus', 'Apple', 899, '۲۵۶ گیگابایت', 'نمایشگر ۶٫۷ اینچ', 'دوربین ۴۸ مگاپیکسل', '#e5bacd'],
  ['اپل آیفون ۱۴', 'Apple iPhone 14', 'Apple', 649, '۱۲۸ گیگابایت', 'تراشه A15 Bionic', 'دوربین ۱۲ مگاپیکسل', '#9bbae1'],
  ['اپل آیفون ۱۴ پلاس', 'Apple iPhone 14 Plus', 'Apple', 749, '۲۵۶ گیگابایت', 'نمایشگر ۶٫۷ اینچ', 'دوربین ۱۲ مگاپیکسل', '#c4b8df'],
  ['اپل آیفون ۱۳', 'Apple iPhone 13', 'Apple', 549, '۱۲۸ گیگابایت', 'تراشه A15 Bionic', 'دوربین ۱۲ مگاپیکسل', '#aec7b6'],
  ['سامسونگ گلکسی S24', 'Samsung Galaxy S24', 'Samsung', 799, '۲۵۶ گیگابایت', 'رم ۸ گیگابایت', 'دوربین ۵۰ مگاپیکسل', '#b4b6d7'],
  ['سامسونگ گلکسی S24 اولترا', 'Samsung Galaxy S24 Ultra', 'Samsung', 1199, '۲۵۶ گیگابایت', 'رم ۱۲ گیگابایت', 'دوربین ۲۰۰ مگاپیکسل', '#c2bcb2'],
  ['سامسونگ گلکسی A55', 'Samsung Galaxy A55 5G', 'Samsung', 449, '۲۵۶ گیگابایت', 'رم ۸ گیگابایت', 'دوربین ۵۰ مگاپیکسل', '#a8c8dc'],
  ['سامسونگ گلکسی A35', 'Samsung Galaxy A35 5G', 'Samsung', 349, '۱۲۸ گیگابایت', 'رم ۶ گیگابایت', 'دوربین ۵۰ مگاپیکسل', '#ced6a5'],
  ['سامسونگ گلکسی S23 FE', 'Samsung Galaxy S23 FE', 'Samsung', 599, '۲۵۶ گیگابایت', 'رم ۸ گیگابایت', 'دوربین ۵۰ مگاپیکسل', '#a1c8bf'],
];
const computers = [
  ['اپل مک‌بوک ایر M3', 'Apple MacBook Air M3 13-inch', 'Apple', 1099, 'رم ۱۶ گیگابایت', 'SSD ۲۵۶ گیگابایت', 'تراشه Apple M3', '#a2b6ce', 'laptop'],
  ['اپل مک‌بوک پرو M3', 'Apple MacBook Pro M3 14-inch', 'Apple', 1599, 'رم ۱۶ گیگابایت', 'SSD ۵۱۲ گیگابایت', 'تراشه Apple M3', '#959fad', 'laptop'],
  ['ایسوس ویووبوک ۱۵', 'ASUS Vivobook 15 X1504', 'ASUS', 649, 'رم ۱۶ گیگابایت', 'SSD ۵۱۲ گیگابایت', 'Intel Core i5-1335U', '#adbfd9', 'laptop'],
  ['لنوو آیدیاپد اسلیم ۳', 'Lenovo IdeaPad Slim 3 15IRU8', 'Lenovo', 599, 'رم ۱۶ گیگابایت', 'SSD ۵۱۲ گیگابایت', 'Intel Core i5-1335U', '#a7b4c6', 'laptop'],
  ['ایسر اسپایر ۵', 'Acer Aspire 5 A515-58M', 'Acer', 699, 'رم ۱۶ گیگابایت', 'SSD ۵۱۲ گیگابایت', 'Intel Core i5-1335U', '#b1c5bd', 'laptop'],
  ['اچ‌پی ویکتوس ۱۵', 'HP Victus 15-fa', 'HP', 999, 'رم ۱۶ گیگابایت', 'SSD ۵۱۲ گیگابایت', 'گرافیک RTX 4050', '#92a9be', 'laptop'],
  ['دل اینسپایرون ۱۵', 'Dell Inspiron 15 3530', 'Dell', 729, 'رم ۱۶ گیگابایت', 'SSD ۵۱۲ گیگابایت', 'Intel Core i5-1334U', '#b5b6c5', 'laptop'],
  ['لنوو LOQ گیمینگ', 'Lenovo LOQ 15IRX9', 'Lenovo', 1199, 'رم ۱۶ گیگابایت', 'SSD ۱ ترابایت', 'گرافیک RTX 4060', '#99a5c1', 'laptop'],
  ['اپل مک مینی M2', 'Apple Mac mini M2', 'Apple', 599, 'رم ۸ گیگابایت', 'SSD ۲۵۶ گیگابایت', 'تراشه Apple M2', '#bcc5d3', 'mini'],
  ['اپل آی‌مک M3', 'Apple iMac M3 24-inch', 'Apple', 1299, 'رم ۸ گیگابایت', 'SSD ۲۵۶ گیگابایت', 'نمایشگر ۲۴ اینچ 4.5K', '#92bdd8', 'desktop'],
];

const audio = [
  ['هدفون سونی WH-1000XM4', 'Sony WH-1000XM4', 'Sony', 279, 'حذف نویز فعال', 'اتصال بلوتوث', 'طراحی دورگوشی', '#9fadc3', 'headphones'],
  ['هدفون بوز QuietComfort 45', 'Bose QuietComfort 45', 'Bose', 249, 'حذف نویز فعال', 'حالت شنیدن محیط', 'طراحی تاشو', '#b5c4d2', 'headphones'],
  ['هدفون سنهایزر مومنتوم ۴', 'Sennheiser Momentum 4 Wireless', 'Sennheiser', 299, 'حذف نویز تطبیقی', 'تنظیم اکولایزر', 'اتصال بلوتوث', '#a1acc0', 'headphones'],
  ['هدفون جی‌بی‌ال Tune 770NC', 'JBL Tune 770NC', 'JBL', 129, 'حذف نویز تطبیقی', 'طراحی تاشو', 'اتصال بلوتوث', '#a8b9df', 'headphones'],
  ['ایرپاد اپل نسل سوم', 'Apple AirPods (3rd generation)', 'Apple', 169, 'تراشه Apple H1', 'اکولایزر تطبیقی', 'مقاومت IPX4', '#e2e8f0', 'earbuds-stem'],
  ['هندزفری سامسونگ گلکسی بادز ۲ پرو', 'Samsung Galaxy Buds2 Pro', 'Samsung', 179, 'حذف نویز فعال', 'حالت صدای محیط', 'کیس شارژ همراه', '#b8aed6', 'earbuds'],
  ['هندزفری سونی WF-C700N', 'Sony WF-C700N', 'Sony', 99, 'حذف نویز فعال', 'بلوتوث ۵٫۲', 'کیس شارژ همراه', '#b7d4c5', 'earbuds'],
  ['اسپیکر جی‌بی‌ال Flip 6', 'JBL Flip 6', 'JBL', 119, 'اتصال بلوتوث', 'مقاومت IP67', 'طراحی قابل حمل', '#87acd8', 'speaker-round'],
  ['اسپیکر مارشال امبرتون ۲', 'Marshall Emberton II', 'Marshall', 149, 'اتصال بلوتوث', 'مقاومت IP67', 'طراحی قابل حمل', '#bdad8d', 'speaker'],
  ['اسپیکر انکر ساندکور Motion+', 'Anker Soundcore Motion+', 'Soundcore', 99, 'پشتیبانی Hi-Res Audio', 'بلوتوث ۵٫۰', 'توان خروجی ۳۰ وات', '#97adbf', 'speaker'],
];

function illustration(kind, tint, index) {
  const defs = `<defs>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fafc"/><stop offset=".45" stop-color="${tint}"/><stop offset="1" stop-color="#64748b"/></linearGradient>
    <linearGradient id="screen" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#0b1835"/><stop offset=".48" stop-color="#2563eb"/><stop offset="1" stop-color="${tint}"/></linearGradient>
    <radialGradient id="orb"><stop stop-color="#eff6ff" stop-opacity=".9"/><stop offset="1" stop-color="#60a5fa" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
    <clipPath id="display"><rect x="186" y="50" width="130" height="254" rx="18"/></clipPath>
    <clipPath id="computer-display">${kind === 'desktop' ? '<rect x="67" y="53" width="346" height="188" rx="5"/>' : '<rect x="100" y="70" width="280" height="172" rx="4"/>'}</clipPath>
  </defs>`;
  const pattern = `<ellipse cx="256" cy="${148 + index * 3}" rx="140" ry="62" fill="none" stroke="#93c5fd" stroke-width="25" opacity=".35" transform="rotate(-38 256 180)"/><ellipse cx="285" cy="208" rx="125" ry="44" fill="none" stroke="#dbeafe" stroke-width="13" opacity=".45" transform="rotate(-38 285 208)"/>`;
  const wallpaper = kind === 'phone' ? pattern : `<g clip-path="url(#computer-display)">${pattern}</g>`;
  let device;
  if (kind === 'headphones') {
    device = `<ellipse cx="240" cy="319" rx="115" ry="10" fill="#0f172a" opacity=".16" filter="url(#shadow)"/>
      <g transform="rotate(-8 240 180)"><path d="M132 215 V154 C132 23 348 23 348 154 V215" fill="none" stroke="#475569" stroke-width="25"/><path d="M132 205 V154 C132 30 348 30 348 154 V205" fill="none" stroke="url(#metal)" stroke-width="17"/><path d="M145 126 C163 51 317 51 335 126" fill="none" stroke="${tint}" stroke-width="22" stroke-linecap="round"/>
      <rect x="108" y="159" width="66" height="133" rx="31" fill="#1e293b" stroke="#64748b" stroke-width="3"/><rect x="108" y="169" width="42" height="113" rx="21" fill="url(#metal)"/><rect x="303" y="159" width="66" height="133" rx="31" fill="#1e293b" stroke="#64748b" stroke-width="3"/><rect x="327" y="169" width="42" height="113" rx="21" fill="url(#metal)"/><path d="M338 263 h10" stroke="#334155" stroke-width="3" stroke-linecap="round"/></g>`;
  } else if (kind.startsWith('earbuds')) {
    const stem = kind === 'earbuds-stem';
    device = `<ellipse cx="240" cy="307" rx="107" ry="10" fill="#0f172a" opacity=".16" filter="url(#shadow)"/><rect x="140" y="209" width="200" height="93" rx="36" fill="url(#metal)" stroke="#94a3b8"/><path d="M143 239 Q240 261 337 239" fill="none" stroke="#64748b"/><circle cx="240" cy="268" r="3" fill="#4ade80"/>
      <g transform="rotate(-18 184 140)">${stem ? '<rect x="189" y="112" width="22" height="84" rx="11" fill="url(#metal)"/>' : ''}<ellipse cx="177" cy="111" rx="37" ry="31" fill="url(#metal)" stroke="#94a3b8"/><ellipse cx="154" cy="113" rx="10" ry="16" fill="#334155"/><path d="M175 94 q13 -3 20 7" fill="none" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/></g>
      <g transform="rotate(18 293 140)">${stem ? '<rect x="268" y="112" width="22" height="84" rx="11" fill="url(#metal)"/>' : ''}<ellipse cx="302" cy="111" rx="37" ry="31" fill="url(#metal)" stroke="#94a3b8"/><ellipse cx="325" cy="113" rx="10" ry="16" fill="#334155"/><path d="M288 94 q13 -3 20 7" fill="none" stroke="#f8fafc" stroke-width="3" stroke-linecap="round"/></g>`;
  } else if (kind.startsWith('speaker')) {
    const rounded = kind === 'speaker-round';
    device = `<defs><pattern id="mesh" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="${tint}" opacity=".65"/></pattern></defs><ellipse cx="240" cy="285" rx="160" ry="11" fill="#0f172a" opacity=".18" filter="url(#shadow)"/>
      <g transform="rotate(-8 240 180)"><rect x="78" y="112" width="324" height="152" rx="${rounded ? 65 : 24}" fill="url(#metal)" stroke="#64748b" stroke-width="2"/><rect x="90" y="123" width="300" height="130" rx="${rounded ? 56 : 18}" fill="#1e293b"/><rect x="90" y="123" width="300" height="130" rx="${rounded ? 56 : 18}" fill="url(#mesh)"/><rect x="209" y="113" width="62" height="11" rx="5" fill="#475569"/><path d="M227 114 v8 m-4 -4 h8 m17 0 h9" stroke="#e2e8f0" stroke-width="2"/><circle cx="240" cy="191" r="13" fill="${tint}" opacity=".85"/><path d="M235 186 L245 191 L235 196Z" fill="#334155"/></g>`;
  } else if (kind === 'phone') {
    const cameras = index < 5 ? '<circle cx="140" cy="73" r="13"/><circle cx="168" cy="99" r="13"/>' : '<circle cx="137" cy="69" r="11"/><circle cx="137" cy="98" r="11"/><circle cx="137" cy="127" r="11"/>';
    device = `<ellipse cx="243" cy="325" rx="99" ry="10" fill="#0f172a" opacity=".18" filter="url(#shadow)"/>
      <g transform="rotate(-12 165 185)"><rect x="112" y="42" width="128" height="260" rx="24" fill="url(#metal)" stroke="#64748b" stroke-width="2"/><rect x="120" y="51" width="63" height="65" rx="17" fill="${tint}"/><g fill="#101b2d" stroke="#94a3b8" stroke-width="3">${cameras}</g><circle cx="169" cy="69" r="4" fill="#f8fafc"/></g>
      <g transform="rotate(9 252 177)"><rect x="180" y="43" width="142" height="268" rx="24" fill="url(#metal)" stroke="#475569" stroke-width="2"/><rect x="185" y="48" width="132" height="258" rx="20" fill="#111827"/><g clip-path="url(#display)"><rect x="186" y="50" width="130" height="254" fill="url(#screen)"/><circle cx="289" cy="110" r="105" fill="url(#orb)"/>${wallpaper}</g><rect x="229" y="56" width="44" height="12" rx="6" fill="#0f172a"/><rect x="231" y="293" width="43" height="3" rx="2" fill="#e2e8f0"/></g>`;
  } else if (kind === 'mini') {
    device = `<ellipse cx="240" cy="285" rx="137" ry="16" fill="#0f172a" opacity=".2" filter="url(#shadow)"/><path d="M105 167 Q103 153 124 151 L353 151 Q375 152 375 167 L375 246 Q375 261 354 263 L124 263 Q105 262 105 246Z" fill="url(#metal)" stroke="#94a3b8"/><rect x="105" y="119" width="270" height="111" rx="28" fill="#dce3eb" stroke="#f8fafc" stroke-width="2"/><rect x="128" y="238" width="42" height="8" rx="3" fill="#1e293b"/><circle cx="351" cy="246" r="3" fill="#f8fafc"/><path d="M225 163 L240 149 L255 163 L240 178Z" fill="#9baabd"/></svg>`;
    device = device.replace('</svg>', '');
  } else if (kind === 'desktop') {
    device = `<ellipse cx="240" cy="324" rx="150" ry="11" fill="#0f172a" opacity=".16" filter="url(#shadow)"/><path d="M220 245 L213 308 L267 308 L259 245Z" fill="url(#metal)"/><rect x="195" y="305" width="91" height="9" rx="4" fill="url(#metal)"/><rect x="59" y="45" width="362" height="227" rx="13" fill="${tint}" stroke="#cbd5e1" stroke-width="2"/><rect x="67" y="53" width="346" height="188" rx="5" fill="url(#screen)"/>${wallpaper}<circle cx="240" cy="256" r="5" fill="#e2e8f0"/><path d="M114 319 L351 319 L369 339 L97 339Z" fill="#cbd5e1" stroke="#f8fafc"/>`;
  } else {
    device = `<ellipse cx="242" cy="297" rx="176" ry="13" fill="#0f172a" opacity=".18" filter="url(#shadow)"/><rect x="86" y="55" width="308" height="205" rx="14" fill="url(#metal)" stroke="#64748b" stroke-width="2"/><rect x="93" y="62" width="294" height="187" rx="9" fill="#0f172a"/><rect x="100" y="70" width="280" height="172" rx="4" fill="url(#screen)"/>${wallpaper}<circle cx="240" cy="66" r="2" fill="#64748b"/><path d="M86 260 L394 260 L446 289 Q447 297 433 298 L46 298 Q33 297 34 289Z" fill="url(#metal)" stroke="#94a3b8"/><path d="M99 264 L381 264 L408 282 L72 282Z" fill="#334155" opacity=".85"/><path d="M210 284 L270 284 L277 291 L203 291Z" fill="#cbd5e1"/><path d="M34 291 L446 291" stroke="#f8fafc"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><title>Demo ${kind} illustration</title>${defs}${device}</svg>\n`;
}

const products = [];
const assets = new URL('../public/assets/products/', import.meta.url);
await mkdir(assets, { recursive: true });
const categoryLabels = { smartphones: 'گوشی هوشمند', laptops: 'لپ‌تاپ و پی‌سی', audio: 'تجهیزات صوتی' };
const kindLabels = { phone: 'گوشی هوشمند', laptop: 'لپ‌تاپ', mini: 'مینی پی‌سی', desktop: 'آل‌این‌وان', headphones: 'هدفون', earbuds: 'هندزفری', 'earbuds-stem': 'هندزفری', speaker: 'اسپیکر', 'speaker-round': 'اسپیکر' };
for (const [category, rows, prefix] of [['smartphones', phones, 'phone'], ['laptops', computers, 'computer'], ['audio', audio, 'audio']]) {
  for (const [index, row] of rows.entries()) {
    const [name, nameEn, brand, price, ...details] = row;
    const [first, second, third, tint, kind = 'phone'] = details;
    const id = `${prefix}-${String(index + 1).padStart(2, '0')}`;
    const kindLabel = kindLabels[kind];
    products.push({ id, name, nameEn, brand, category, categoryFa: categoryLabels[category], kindLabel,
      price, rating: 0, reviewCount: 0, image: `/assets/products/${id}.svg`, specs: [first, second, third],
      description: `${name}؛ ${first}، ${second} و ${third}. پیکربندی و قیمت نمونه برای تست فروشگاه.`, inStock: true, demo: true });
    await writeFile(new URL(`${id}.svg`, assets), illustration(kind, tint, index), 'utf8');
  }
}
await writeFile(new URL('../backend/data/catalog-products.json', import.meta.url), JSON.stringify(products, null, 2) + '\n', 'utf8');
console.log(`Generated ${products.length} demo products and local SVG illustrations.`);
