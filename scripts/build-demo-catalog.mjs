// Reproducible, self-hosted demo catalogue. Prices/configurations are examples,
// not live offers. The original SVG illustrations are not manufacturer photos.
import { mkdir, writeFile } from 'node:fs/promises';

const phones = [
  ['اپل آیفون ۱۵', 'Apple iPhone 15', 'Apple', 799, '۱۲۸ گیگابایت', 'تراشه A16 Bionic', 'دوربین ۴۸ مگاپیکسل', '#a4d5dc'],
  ['اپل آیفون ۱۵ پرو مکس', 'Apple iPhone 15 Pro Max', 'Apple', 899, '۲۵۶ گیگابایت', 'نمایشگر ۶٫۷ اینچ', 'دوربین ۴۸ مگاپیکسل', '#e5bacd'],
  ['اپل آیفون ۱۴', 'Apple iPhone 14', 'Apple', 649, '۱۲۸ گیگابایت', 'تراشه A15 Bionic', 'دوربین ۱۲ مگاپیکسل', '#9bbae1'],
  ['اپل آیفون ۱۴ پرو مکس', 'Apple iPhone 14 Pro Max', 'Apple', 749, '۲۵۶ گیگابایت', 'نمایشگر ۶٫۷ اینچ', 'دوربین ۴۸ مگاپیکسل', '#c4b8df'],
  ['اپل آیفون ۱۳', 'Apple iPhone 13', 'Apple', 549, '۱۲۸ گیگابایت', 'تراشه A15 Bionic', 'دوربین ۱۲ مگاپیکسل', '#aec7b6'],
  ['سامسونگ گلکسی S24', 'Samsung Galaxy S24', 'Samsung', 799, '۲۵۶ گیگابایت', 'رم ۸ گیگابایت', 'دوربین ۵۰ مگاپیکسل', '#b4b6d7'],
  ['سامسونگ گلکسی S24 اولترا', 'Samsung Galaxy S24 Ultra', 'Samsung', 1199, '۲۵۶ گیگابایت', 'رم ۱۲ گیگابایت', 'دوربین ۲۰۰ مگاپیکسل', '#c2bcb2'],
  ['سامسونگ گلکسی A55', 'Samsung Galaxy A55 5G', 'Samsung', 449, '۲۵۶ گیگابایت', 'رم ۸ گیگابایت', 'دوربین ۵۰ مگاپیکسل', '#a8c8dc'],
  ['سامسونگ گلکسی A35', 'Samsung Galaxy A35 5G', 'Samsung', 349, '۱۲۸ گیگابایت', 'رم ۶ گیگابایت', 'دوربین ۵۰ مگاپیکسل', '#ced6a5'],
  ['سامسونگ گلکسی S23 FE', 'Samsung Galaxy S23 FE', 'Samsung', 599, '۲۵۶ گیگابایت', 'رم ۸ گیگابایت', 'دوربین ۵۰ مگاپیکسل', '#a1c8bf'],
];
const extras = [
  ['روتر تی‌پی‌لینک Archer AX55', 'TP-Link Archer AX55', 'TP-Link', 109, 'Wi-Fi 6 دو بانده', 'ردهٔ AX3000', 'درگاه USB 3.0', '#a9bfd5', 'extra-router'],
  ['سیستم مش تی‌پی‌لینک Deco X20', 'TP-Link Deco X20 3-Pack', 'TP-Link', 199, 'بستهٔ سه‌تایی', 'Wi-Fi 6', 'ردهٔ AX1800', '#c7d6e2', 'extra-mesh'],
  ['مانیتور دل P2422H', 'Dell P2422H 23.8-inch', 'Dell', 189, 'نمایشگر ۲۳٫۸ اینچ', 'وضوح Full HD', 'نرخ نوسازی ۶۰ هرتز', '#a6bdd4', 'extra-monitor'],
  ['چاپگر اپسون EcoTank ET-2850', 'Epson EcoTank ET-2850', 'Epson', 299, 'چاپ، اسکن و کپی', 'مخزن جوهر قابل‌پرکردن', 'چاپ دوروی خودکار', '#adbcd0', 'extra-printer'],
  ['پروژکتور قابل‌حمل بنکیو GV30', 'BenQ GV30', 'BenQ', 399, 'وضوح بومی 720p', 'روشنایی ۳۰۰ ANSI لومن', 'طراحی قابل‌حمل', '#ccd5e2', 'extra-projector'],
  ['وب‌کم لاجیتک C920s', 'Logitech C920s HD Pro Webcam', 'Logitech', 69, 'ویدئوی 1080p با ۳۰ فریم', 'درپوش حریم خصوصی', 'میکروفون استریو', '#a1b3c7', 'extra-webcam'],
  ['میکروفون الگاتو Wave Neo', 'Elgato Wave Neo', 'Elgato', 89, 'اتصال USB', 'پایهٔ رومیزی', 'کلید لمسی قطع صدا', '#d1dce7', 'extra-mic'],
  ['کتاب‌خوان کوبو Clara BW', 'Kobo Clara BW 16GB', 'Kobo', 129, 'نمایشگر ۶ اینچ', 'جوهر الکترونیک سیاه‌وسفید', 'حافظهٔ ۱۶ گیگابایت', '#b1c4d5', 'extra-reader'],
  ['قلم نوری وان بای وکام Small', 'One by Wacom Small CTL-472', 'Wacom', 59, '۲۰۴۸ سطح فشار', 'قلم بدون باتری', 'سایز Small', '#beafc5', 'extra-tablet'],
  ['فلش سن‌دیسک Ultra Dual Drive Go', 'SanDisk Ultra Dual Drive Go 128GB', 'SanDisk', 19, 'ظرفیت ۱۲۸ گیگابایت', 'دو رابط USB-C و USB-A', 'طراحی چرخشی', '#a3bdd0', 'extra-flash'],
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

const gaming = [
  ['کنسول پلی‌استیشن ۵ اسلیم دیسک‌خور', 'Sony PlayStation 5 Slim Disc Edition 1TB', 'Sony', 499, 'SSD یک ترابایت', 'درایو دیسک Blu-ray', 'کنترلر DualSense', '#d6e3f4', 'console-ps'],
  ['کنسول پلی‌استیشن ۵ اسلیم دیجیتال', 'Sony PlayStation 5 Slim Digital Edition 1TB', 'Sony', 449, 'SSD یک ترابایت', 'نسخهٔ بدون دیسک', 'کنترلر DualSense', '#bccde5', 'console-ps'],
  ['کنسول ایکس‌باکس سری ایکس', 'Microsoft Xbox Series X 1TB Carbon Black', 'Microsoft', 499, 'SSD یک ترابایت', 'درایو دیسک Blu-ray', 'کنترلر بی‌سیم', '#687c88', 'console-x'],
  ['کنسول ایکس‌باکس سری اس', 'Microsoft Xbox Series S 512GB Robot White', 'Microsoft', 299, 'SSD ۵۱۲ گیگابایت', 'نسخهٔ بدون دیسک', 'کنترلر بی‌سیم', '#e1e7ef', 'console-s'],
  ['کنسول نینتندو سوییچ OLED', 'Nintendo Switch OLED 64GB White', 'Nintendo', 349, 'نمایشگر OLED هفت اینچ', 'حافظهٔ ۶۴ گیگابایت', 'کنترلرهای جداشدنی', '#d6e1ef', 'handheld'],
  ['کنسول نینتندو سوییچ لایت', 'Nintendo Switch Lite Turquoise', 'Nintendo', 199, 'کنسول دستی', 'کنترلرهای یکپارچه', 'نمایشگر لمسی', '#79c9c4', 'handheld'],
  ['کنسول دستی استیم دک OLED', 'Valve Steam Deck OLED 512GB', 'Valve', 549, 'SSD ۵۱۲ گیگابایت', 'نمایشگر OLED', 'سیستم‌عامل SteamOS', '#74869b', 'handheld'],
  ['دستهٔ پلی‌استیشن دوال‌سنس', 'Sony DualSense Wireless Controller White', 'Sony', 69, 'بازخورد لمسی', 'تریگرهای تطبیقی', 'میکروفون داخلی', '#dce8f4', 'gamepad'],
  ['دستهٔ بی‌سیم ایکس‌باکس', 'Microsoft Xbox Wireless Controller Carbon Black', 'Microsoft', 59, 'اتصال بلوتوث', 'درگاه USB-C', 'دکمهٔ اشتراک‌گذاری', '#7f91aa', 'gamepad'],
  ['ماوس گیمینگ لاجیتک G502 HERO', 'Logitech G502 HERO', 'Logitech', 49, 'حسگر HERO', 'اتصال سیمی USB', 'دکمه‌های قابل تنظیم', '#7e9ac2', 'mouse'],
];

const smartHome = [
  ['دوربین هوشمند تی‌پی‌لینک Tapo C200', 'TP-Link Tapo C200', 'TP-Link', 29, 'تصویر Full HD 1080p', 'چرخش افقی ۳۶۰ درجه', 'صدای دوطرفه', '#b8d5e9', 'home-camera'],
  ['دوربین هوشمند تی‌پی‌لینک Tapo C210', 'TP-Link Tapo C210', 'TP-Link', 39, 'تصویر ۳ مگاپیکسل', 'قابلیت چرخش دوربین', 'دید در شب', '#b5c7df', 'home-camera'],
  ['دوربین فضای باز تی‌پی‌لینک Tapo C320WS', 'TP-Link Tapo C320WS', 'TP-Link', 59, 'مقاومت IP66', 'اتصال Wi-Fi یا اترنت', 'دید در شب رنگی', '#aac5d7', 'home-outdoor'],
  ['پریز هوشمند تی‌پی‌لینک Tapo P100', 'TP-Link Tapo P100 (EU)', 'TP-Link', 15, 'اتصال Wi-Fi', 'زمان‌بندی روشن و خاموش', 'نسخهٔ دوشاخهٔ اروپایی', '#c0d4e8', 'home-plug'],
  ['پریز هوشمند تی‌پی‌لینک Tapo P110', 'TP-Link Tapo P110 (EU)', 'TP-Link', 19, 'پایش مصرف انرژی', 'کنترل از راه دور', 'نسخهٔ دوشاخهٔ اروپایی', '#b4cfca', 'home-plug'],
  ['لامپ هوشمند رنگی تی‌پی‌لینک Tapo L530E', 'TP-Link Tapo L530E', 'TP-Link', 14, 'سرپیچ E27', 'نور رنگی و قابل تنظیم', 'بدون نیاز به هاب', '#b3c4f1', 'home-bulb'],
  ['نوار نور هوشمند تی‌پی‌لینک Tapo L900-5', 'TP-Link Tapo L900-5', 'TP-Link', 25, 'طول ۵ متر', 'نور چندرنگ', 'کنترل با اپلیکیشن', '#b8b6ed', 'home-strip'],
  ['سنسور حرکت تی‌پی‌لینک Tapo T100', 'TP-Link Tapo T100', 'TP-Link', 19, 'تشخیص حرکت', 'اعلان در اپلیکیشن', 'نیازمند هاب Tapo سازگار', '#bfd9da', 'home-motion'],
  ['سنسور در و پنجره تی‌پی‌لینک Tapo T110', 'TP-Link Tapo T110', 'TP-Link', 17, 'تشخیص باز و بسته شدن', 'اعلان در اپلیکیشن', 'نیازمند هاب Tapo سازگار', '#b7cedf', 'home-contact'],
  ['هاب هوشمند تی‌پی‌لینک Tapo H100', 'TP-Link Tapo H100 (EU)', 'TP-Link', 25, 'اتصال تا ۶۴ دستگاه سازگار', 'زنگ هشدار داخلی', 'نسخهٔ دوشاخهٔ اروپایی', '#b8c5de', 'home-hub'],
];

const wearables = [
  ['اپل واچ سری ۹', 'Apple Watch Series 9 GPS 41mm', 'Apple', 399, 'بدنهٔ ۴۱ میلی‌متری', 'تراشه S9', 'نمایشگر همیشه‌روشن Retina', '#9cabbf', 'watch-square'],
  ['اپل واچ SE نسل دوم', 'Apple Watch SE (2nd generation) GPS 40mm', 'Apple', 249, 'بدنهٔ ۴۰ میلی‌متری', 'تراشه S8', 'نمایشگر Retina OLED', '#cfbfae', 'watch-square'],
  ['اپل واچ اولترا ۲', 'Apple Watch Ultra 2 49mm', 'Apple', 799, 'بدنهٔ تیتانیومی ۴۹ میلی‌متری', 'تراشه S9', 'GPS دوفرکانسه', '#d6a477', 'watch-square'],
  ['سامسونگ گلکسی واچ ۶', 'Samsung Galaxy Watch6 Bluetooth 40mm', 'Samsung', 249, 'بدنهٔ ۴۰ میلی‌متری', 'نمایشگر Super AMOLED', 'اتصال بلوتوث', '#abbcae', 'watch-round'],
  ['سامسونگ گلکسی واچ ۶ کلاسیک', 'Samsung Galaxy Watch6 Classic Bluetooth 43mm', 'Samsung', 329, 'بدنهٔ ۴۳ میلی‌متری', 'حلقهٔ چرخان', 'نمایشگر Super AMOLED', '#b6c4d4', 'watch-round'],
  ['سامسونگ گلکسی واچ FE', 'Samsung Galaxy Watch FE Bluetooth 40mm', 'Samsung', 199, 'بدنهٔ ۴۰ میلی‌متری', 'نمایشگر Super AMOLED', 'اتصال بلوتوث', '#a6b1c7', 'watch-round'],
  ['مچ‌بند شیائومی اسمارت بند ۹', 'Xiaomi Smart Band 9', 'Xiaomi', 49, 'نمایشگر AMOLED ۱٫۶۲ اینچ', 'بلوتوث ۵٫۴', 'بند قابل تعویض', '#adb8d4', 'fitness-band'],
  ['ساعت شیائومی ردمی واچ ۴', 'Xiaomi Redmi Watch 4', 'Xiaomi', 99, 'نمایشگر AMOLED ۱٫۹۷ اینچ', 'موقعیت‌یابی ماهواره‌ای داخلی', 'مکالمه از طریق بلوتوث', '#b2c6c9', 'watch-square'],
  ['ساعت شیائومی واچ S3', 'Xiaomi Watch S3', 'Xiaomi', 149, 'نمایشگر AMOLED ۱٫۴۳ اینچ', 'موقعیت‌یابی دوفرکانسه', 'حلقهٔ قابل تعویض', '#a4b9ce', 'watch-round'],
  ['ساعت امیزفیت بیپ ۵', 'Amazfit Bip 5', 'Amazfit', 89, 'نمایشگر ۱٫۹۱ اینچ', 'GPS داخلی', 'مکالمه از طریق بلوتوث', '#c7b7c6', 'watch-square'],
];

const accessories = [
  ['ماوس لاجیتک MX Master 3S', 'Logitech MX Master 3S', 'Logitech', 99, 'اتصال بلوتوث', 'طراحی ارگونومیک', 'باتری قابل شارژ', '#94a3b8', 'accessory-mouse'],
  ['ماوس لاجیتک Pebble Mouse 2', 'Logitech Pebble Mouse 2 M350s', 'Logitech', 29, 'اتصال بلوتوث', 'جابه‌جایی بین ۳ دستگاه', 'کلیک کم‌صدا', '#c5becd', 'accessory-mouse'],
  ['کیبورد لاجیتک Pebble Keys 2', 'Logitech Pebble Keys 2 K380s', 'Logitech', 39, 'اتصال بلوتوث', 'طراحی جمع‌وجور', 'کلیدهای گرد', '#c5d2dc', 'accessory-keyboard'],
  ['کیبورد لاجیتک MX Keys Mini', 'Logitech MX Keys Mini', 'Logitech', 99, 'نور پس‌زمینهٔ هوشمند', 'طراحی بدون بخش اعداد', 'اتصال بی‌سیم', '#9caac0', 'accessory-keyboard'],
  ['شارژر انکر نانو ۳ سی‌وات', 'Anker 511 Charger Nano 3 30W A2147', 'Anker', 25, 'توان حداکثر ۳۰ وات', 'درگاه USB-C', 'طراحی کوچک', '#b2c5db', 'accessory-charger'],
  ['پاوربانک انکر ۷۳۷', 'Anker 737 Power Bank 24K A1289', 'Anker', 129, 'ظرفیت ۲۴۰۰۰ میلی‌آمپرساعت', 'خروجی USB-C تا ۱۴۰ وات', 'نمایشگر دیجیتال', '#97a9bf', 'accessory-powerbank'],
  ['شارژر بیست‌وات اپل', 'Apple 20W USB-C Power Adapter', 'Apple', 19, 'توان ۲۰ وات', 'درگاه USB-C', 'کابل جداگانه', '#e1e6ef', 'accessory-charger'],
  ['کابل شارژ USB-C اپل', 'Apple 60W USB-C Charge Cable 1m', 'Apple', 19, 'طول ۱ متر', 'دو سر USB-C', 'پشتیبانی از شارژ تا ۶۰ وات', '#d4dce9', 'accessory-cable'],
  ['اس‌اس‌دی قابل‌حمل سامسونگ T7 Shield', 'Samsung Portable SSD T7 Shield 1TB', 'Samsung', 99, 'ظرفیت ۱ ترابایت', 'رابط USB 3.2 Gen 2', 'بدنهٔ قابل‌حمل', '#98b6d4', 'accessory-ssd'],
  ['هاب یوگرین Revodok 105', 'UGREEN Revodok 105 5-in-1 USB-C Hub', 'UGREEN', 29, 'هاب ۵ در ۱', 'خروجی HDMI تا 4K/30Hz', 'درگاه شارژ USB-C PD', '#b4c1d1', 'accessory-hub'],
];

const cameras = [
  ['دوربین کانن EOS R50 با لنز ۱۸–۴۵', 'Canon EOS R50 + RF-S 18-45mm F4.5-6.3 IS STM', 'Canon', 749, 'حسگر APS-C با ۲۴٫۲ مگاپیکسل', 'لنز کیت RF-S 18-45mm', 'مانت Canon RF', '#9baec6', 'camera-kit'],
  ['دوربین کانن EOS R10 با لنز ۱۸–۴۵', 'Canon EOS R10 + RF-S 18-45mm F4.5-6.3 IS STM', 'Canon', 999, 'حسگر APS-C با ۲۴٫۲ مگاپیکسل', 'لنز کیت RF-S 18-45mm', 'مانت Canon RF', '#a5b8cc', 'camera-kit'],
  ['دوربین سونی ZV-E10 با لنز ۱۶–۵۰', 'Sony ZV-E10 + E PZ 16-50mm F3.5-5.6 OSS', 'Sony', 699, 'حسگر APS-C با ۲۴٫۲ مگاپیکسل', 'لنز کیت E PZ 16-50mm OSS', 'مانت Sony E', '#9cabc2', 'camera-kit'],
  ['دوربین سونی آلفا a6400 با لنز ۱۶–۵۰', 'Sony Alpha a6400 + E PZ 16-50mm F3.5-5.6 OSS', 'Sony', 899, 'حسگر APS-C با ۲۴٫۲ مگاپیکسل', 'لنز کیت E PZ 16-50mm OSS', 'مانت Sony E', '#b1bfd0', 'camera-kit'],
  ['دوربین نیکون Z50 با لنز ۱۶–۵۰', 'Nikon Z50 + NIKKOR Z DX 16-50mm f/3.5-6.3 VR', 'Nikon', 949, 'حسگر DX با ۲۰٫۹ مگاپیکسل', 'لنز کیت Z DX 16-50mm VR', 'مانت Nikon Z', '#a7b8c5', 'camera-kit'],
  ['دوربین فوجی‌فیلم X-S20 بدنه', 'Fujifilm X-S20 Body Only', 'Fujifilm', 1299, 'حسگر APS-C با ۲۶٫۱ مگاپیکسل', 'لرزش‌گیر داخلی بدنه', 'مانت Fujifilm X؛ بدون لنز', '#adb7ca', 'camera-body'],
  ['لنز کانن RF 50mm F1.8 STM', 'Canon RF 50mm F1.8 STM', 'Canon', 199, 'فاصلهٔ کانونی ۵۰ میلی‌متر', 'دیافراگم f/1.8', 'مانت Canon RF', '#a6bbcf', 'camera-lens'],
  ['لنز سونی FE 50mm F1.8', 'Sony FE 50mm F1.8 SEL50F18F', 'Sony', 249, 'فاصلهٔ کانونی ۵۰ میلی‌متر', 'دیافراگم f/1.8', 'مانت Sony E؛ پوشش فول‌فریم', '#9cacc5', 'camera-lens'],
  ['لنز سیگما 30mm F1.4 DC DN برای سونی', 'Sigma 30mm F1.4 DC DN Contemporary Sony E', 'Sigma', 339, 'فاصلهٔ کانونی ۳۰ میلی‌متر', 'دیافراگم f/1.4', 'مانت Sony E؛ ویژهٔ APS-C', '#b4c3d0', 'camera-lens'],
  ['لنز نیکون NIKKOR Z 40mm f/2', 'Nikon NIKKOR Z 40mm f/2', 'Nikon', 279, 'فاصلهٔ کانونی ۴۰ میلی‌متر', 'دیافراگم f/2', 'مانت Nikon Z؛ پوشش فول‌فریم', '#a7bad1', 'camera-lens'],
];

const drones = [
  ['پهپاد دی‌جی‌آی Mini 4 Pro', 'DJI Mini 4 Pro', 'DJI', 759, 'حسگر ۱/۱٫۳ اینچ', 'فیلم‌برداری 4K', 'گیمبال سه‌محوره', '#bac9d8', 'drone-folding'],
  ['پهپاد دی‌جی‌آی Mini 3', 'DJI Mini 3', 'DJI', 469, 'فیلم‌برداری 4K HDR', 'تصویربرداری عمودی واقعی', 'گیمبال سه‌محوره', '#c5d0da', 'drone-folding'],
  ['پهپاد دی‌جی‌آی Mini 4K', 'DJI Mini 4K', 'DJI', 299, 'فیلم‌برداری 4K/30fps', 'گیمبال سه‌محوره', 'بازوهای تاشو', '#b7c5d6', 'drone-folding'],
  ['پهپاد دی‌جی‌آی Air 3', 'DJI Air 3', 'DJI', 1099, 'دو دوربین واید و تله', 'عکاسی ۴۸ مگاپیکسل', 'گیمبال سه‌محوره', '#9eaec2', 'drone-folding'],
  ['پهپاد دی‌جی‌آی Air 3S', 'DJI Air 3S', 'DJI', 1199, 'حسگر اصلی یک اینچ', 'دو دوربین واید و تله', 'فیلم‌برداری 4K HDR', '#a6b6cb', 'drone-folding'],
  ['پهپاد دی‌جی‌آی Neo', 'DJI Neo', 'DJI', 199, 'وزن حدود ۱۳۵ گرم', 'فیلم‌برداری 4K/30fps', 'بدنهٔ جمع‌وجور', '#d1dbe3', 'drone-guarded'],
  ['پهپاد دی‌جی‌آی Flip', 'DJI Flip', 'DJI', 439, 'حسگر ۱/۱٫۳ اینچ', 'فیلم‌برداری 4K/60fps HDR', 'محافظ کامل ملخ‌ها', '#bbc9d8', 'drone-guarded'],
  ['پهپاد دی‌جی‌آی Avata 2', 'DJI Avata 2', 'DJI', 489, 'پهپاد FPV', 'فیلم‌برداری 4K/60fps', 'محافظ یکپارچهٔ ملخ‌ها', '#9cacc0', 'drone-guarded'],
  ['پهپاد اتل EVO Nano پلاس', 'Autel EVO Nano+ Orange', 'Autel', 649, 'دوربین ۵۰ مگاپیکسل', 'فیلم‌برداری 4K/30fps', 'بازوهای تاشو', '#e2ab7b', 'drone-folding'],
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
  if (kind.startsWith('extra-')) {
    const drawings = {
      'extra-router': '<path d="M120 215V80M190 215V60M290 215V60M360 215V80" stroke="#334155" stroke-width="16" stroke-linecap="round"/><rect x="90" y="205" width="300" height="90" rx="23"/><path d="M125 256h30m18 0h20" stroke="#60a5fa" stroke-width="5"/>',
      'extra-mesh': '<rect x="75" y="135" width="100" height="160" rx="30"/><rect x="190" y="65" width="100" height="230" rx="30"/><rect x="305" y="135" width="100" height="160" rx="30"/><path d="M111 265h28m87 0h28m87 0h28" stroke="#60a5fa" stroke-width="5"/>',
      'extra-monitor': '<rect x="65" y="58" width="350" height="230" rx="12"/><rect x="77" y="70" width="326" height="193" rx="4" fill="#172b4a"/><path d="M240 288v35m-60 0h120" stroke="#64748b" stroke-width="12"/>',
      'extra-printer': '<rect x="115" y="105" width="250" height="90" rx="12"/><rect x="80" y="165" width="320" height="125" rx="24"/><rect x="137" y="208" width="206" height="90" rx="8" fill="#334155"/><path d="M160 260h160v65H160z" fill="#f8fafc"/><circle cx="370" cy="194" r="7" fill="#60a5fa"/>',
      'extra-projector': '<circle cx="240" cy="176" r="113"/><rect x="203" y="105" width="74" height="74" rx="18" fill="#334155"/><circle cx="240" cy="142" r="25" fill="#60a5fa"/><path d="M190 225h100m-100 14h100m-85 60h70" stroke="#64748b" stroke-width="8"/>',
      'extra-webcam': '<path d="M170 220v65h140v-65" stroke="#475569" stroke-width="18" fill="none"/><rect x="75" y="100" width="330" height="130" rx="35"/><circle cx="240" cy="165" r="48" fill="#1e293b"/><circle cx="240" cy="165" r="30" fill="#60a5fa"/>',
      'extra-mic': '<rect x="195" y="48" width="90" height="180" rx="44"/><path d="M170 170v25a70 70 0 0 0 140 0v-25M240 265v45m-65 0h130" fill="none" stroke="#64748b" stroke-width="12"/><path d="M211 85h58m-58 20h58m-58 20h58" stroke="#64748b" stroke-width="5"/>',
      'extra-reader': '<rect x="140" y="35" width="200" height="290" rx="22"/><rect x="155" y="53" width="170" height="245" rx="6" fill="#f1f5f9"/><path d="M178 105h125m-125 26h110m-110 26h125m-125 26h100m-100 26h125m-125 26h110" stroke="#94a3b8" stroke-width="5"/>',
      'extra-tablet': '<rect x="55" y="85" width="330" height="220" rx="17"/><rect x="78" y="108" width="284" height="173" rx="8" fill="#334155"/><path d="M410 85v200" stroke="#64748b" stroke-width="13" stroke-linecap="round"/><path d="M410 285v18" stroke="#94a3b8" stroke-width="5"/>',
      'extra-flash': '<g transform="rotate(-25 240 180)"><rect x="108" y="139" width="240" height="95" rx="25"/><path d="M348 155h55v62h-55" fill="#cbd5e1" stroke="#64748b" stroke-width="3"/><circle cx="148" cy="186" r="21" fill="#475569"/><path d="M205 165h95m-95 20h95" stroke="#64748b" stroke-width="5"/></g>',
    };
    device = `<g fill="url(#metal)" stroke="#94a3b8" stroke-width="2">${drawings[kind]}</g>`;
  } else if (kind.startsWith('drone-')) {
    const rotors = [[111, 112], [369, 112], [103, 253], [377, 253]];
    const arms = '<path d="M211 155 L111 112 M269 155 L369 112 M209 216 L103 253 M271 216 L377 253" fill="none" stroke="#64748b" stroke-width="24" stroke-linecap="round"/>';
    const blades = rotors.map(([x, y], i) => `<g transform="translate(${x} ${y})">${kind === 'drone-guarded' ? '<ellipse rx="70" ry="44" fill="none" stroke="#94a3b8" stroke-width="7"/>' : ''}<ellipse rx="19" ry="15" fill="#334155"/><g transform="rotate(${i % 2 ? -24 : 24})"><ellipse rx="67" ry="9" fill="#1e293b"/><ellipse rx="8" ry="7" fill="#94a3b8"/></g></g>`).join('');
    device = `<ellipse cx="240" cy="323" rx="143" ry="9" fill="#0f172a" opacity=".12" filter="url(#shadow)"/><g transform="rotate(-6 240 180)">${arms}<path d="M213 98 Q240 85 267 98 L293 209 Q294 242 267 254 H213 Q186 242 187 209Z" fill="url(#metal)" stroke="#94a3b8" stroke-width="2"/><path d="M216 118 H264 L274 193 H206Z" fill="${tint}"/><rect x="219" y="232" width="42" height="39" rx="12" fill="#334155"/><circle cx="240" cy="253" r="12" fill="#0f172a" stroke="#64748b" stroke-width="3"/><circle cx="237" cy="250" r="4" fill="#60a5fa"/>${blades}</g>`;
  } else if (kind.startsWith('camera-')) {
    const glass = '<circle cx="256" cy="192" r="59" fill="#0b1835" stroke="#64748b" stroke-width="8"/><circle cx="256" cy="192" r="43" fill="url(#screen)"/><circle cx="244" cy="179" r="16" fill="#93c5fd" opacity=".35"/><circle cx="256" cy="192" r="23" fill="#0f172a" opacity=".7"/>';
    const body = '<path d="M91 124 H178 L195 97 H274 L291 124 H375 Q394 124 394 145 V273 Q394 291 375 291 H91 Q73 291 73 273 V145 Q73 124 91 124Z" fill="#334155" stroke="#64748b" stroke-width="3"/><rect x="90" y="135" width="70" height="142" rx="21" fill="#1e293b"/><rect x="108" y="113" width="39" height="12" rx="4" fill="url(#metal)"/><rect x="207" y="107" width="52" height="17" rx="4" fill="#0f172a"/><circle cx="354" cy="148" r="6" fill="#cbd5e1"/>';
    const lens = kind === 'camera-body'
      ? '<circle cx="256" cy="201" r="68" fill="#94a3b8"/><circle cx="256" cy="201" r="57" fill="#111827"/><rect x="221" y="177" width="70" height="47" rx="3" fill="url(#screen)"/>'
      : `<circle cx="256" cy="192" r="82" fill="#1e293b" stroke="${tint}" stroke-width="4"/><circle cx="256" cy="192" r="72" fill="none" stroke="#475569" stroke-width="8" stroke-dasharray="3 5"/>${glass}`;
    const standalone = `<path d="M174 85 H306 L329 236 Q329 277 240 277 Q151 277 151 236Z" fill="#334155" stroke="#64748b" stroke-width="3"/><path d="M164 155 H316 M159 187 H321 M155 217 H325" stroke="#94a3b8" stroke-width="5"/><ellipse cx="240" cy="86" rx="66" ry="27" fill="#0f172a" stroke="${tint}" stroke-width="5"/><ellipse cx="240" cy="86" rx="51" ry="19" fill="url(#screen)"/>`;
    device = `<ellipse cx="240" cy="315" rx="136" ry="9" fill="#0f172a" opacity=".12" filter="url(#shadow)"/><g transform="rotate(-8 240 180)">${kind === 'camera-lens' ? standalone : body + lens}</g>`;
  } else if (kind.startsWith('accessory-')) {
    const shell = 'fill="url(#metal)" stroke="#94a3b8" stroke-width="2"';
    const shapes = {
      'accessory-mouse': `<rect x="158" y="61" width="164" height="232" rx="78" ${shell}/><path d="M240 66 v103 M161 162 Q240 181 319 162" fill="none" stroke="#64748b" stroke-width="3"/><rect x="230" y="100" width="20" height="43" rx="10" fill="#334155"/><path d="M183 205 Q178 247 198 265" fill="none" stroke="#f8fafc" stroke-width="4" opacity=".6"/>`,
      'accessory-keyboard': `<rect x="53" y="98" width="374" height="166" rx="20" ${shell}/>${Array.from({ length: 4 }, (_, row) => Array.from({ length: 12 }, (_, col) => `<rect x="${67 + col * 29}" y="${111 + row * 29}" width="23" height="22" rx="${index === 2 ? 11 : 5}" fill="#f1f5f9" stroke="#94a3b8"/>`).join('')).join('')}<rect x="155" y="231" width="160" height="20" rx="5" fill="#f1f5f9" stroke="#94a3b8"/>`,
      'accessory-charger': `<path d="M205 98 V55 M265 98 V55" stroke="#94a3b8" stroke-width="14" stroke-linecap="round"/><rect x="153" y="93" width="174" height="194" rx="35" ${shell}/><path d="M160 232 H320" stroke="#94a3b8" stroke-width="2"/><rect x="212" y="250" width="56" height="16" rx="8" fill="#1e293b"/><path d="M250 130 L224 173 H246 L230 207 L265 160 H243Z" fill="#64748b" opacity=".6"/>`,
      'accessory-powerbank': `<rect x="164" y="54" width="152" height="250" rx="25" ${shell}/><rect x="178" y="70" width="124" height="90" rx="15" fill="#17253a"/><rect x="203" y="95" width="68" height="30" rx="5" fill="none" stroke="#93c5fd" stroke-width="3"/><path d="M209 110 H248" stroke="#93c5fd" stroke-width="15"/><rect x="210" y="276" width="43" height="11" rx="5" fill="#334155"/>`,
      'accessory-cable': `<path d="M156 101 C52 116 85 280 231 283 C395 289 406 83 273 89 C177 89 166 225 263 233 C331 236 354 158 303 132" fill="none" stroke="${tint}" stroke-width="13" stroke-linecap="round"/><rect x="137" y="64" width="36" height="61" rx="12" ${shell}/><rect x="145" y="45" width="20" height="26" rx="6" fill="#cbd5e1" stroke="#64748b"/><rect x="285" y="103" width="36" height="61" rx="12" ${shell}/><rect x="293" y="84" width="20" height="26" rx="6" fill="#cbd5e1" stroke="#64748b"/>`,
      'accessory-ssd': `<rect x="137" y="67" width="206" height="227" rx="30" ${shell}/>${Array.from({length:6},(_,i)=>`<path d="M${165+i*30} 91 V265" stroke="#64748b" stroke-width="8" opacity=".5" stroke-linecap="round"/>`).join('')}<rect x="218" y="279" width="44" height="9" rx="4" fill="#1e293b"/>`,
      'accessory-hub': `<path d="M345 191 C417 169 387 59 262 70 L191 78" fill="none" stroke="#475569" stroke-width="12"/><rect x="136" y="65" width="62" height="28" rx="9" ${shell}/><rect x="117" y="71" width="25" height="16" rx="5" fill="#cbd5e1" stroke="#64748b"/><rect x="87" y="168" width="306" height="110" rx="23" ${shell}/><rect x="109" y="226" width="47" height="20" rx="3" fill="#1e293b"/><rect x="173" y="226" width="47" height="20" rx="3" fill="#1e293b"/><path d="M239 226 H294 L286 246 H247Z" fill="#1e293b"/><rect x="315" y="230" width="40" height="12" rx="6" fill="#1e293b"/>`,
    };
    device = `<ellipse cx="240" cy="319" rx="135" ry="10" fill="#0f172a" opacity=".12" filter="url(#shadow)"/><g transform="rotate(-9 240 180)">${shapes[kind]}</g>`;
  } else if (kind.startsWith('watch-') || kind === 'fitness-band') {
    const round = kind === 'watch-round';
    const band = kind === 'fitness-band';
    const face = round
      ? '<circle cx="240" cy="176" r="76" fill="url(#metal)" stroke="#64748b" stroke-width="3"/><circle cx="240" cy="176" r="66" fill="#0b1835"/><circle cx="240" cy="176" r="55" fill="none" stroke="#64748b" stroke-width="3" stroke-dasharray="2 26"/>'
      : `<rect x="${band ? 196 : 162}" y="91" width="${band ? 88 : 156}" height="170" rx="${band ? 44 : 37}" fill="url(#metal)" stroke="#64748b" stroke-width="3"/><rect x="${band ? 203 : 169}" y="98" width="${band ? 74 : 142}" height="156" rx="${band ? 37 : 31}" fill="#0b1835"/>`;
    const dial = band
      ? '<path d="M224 148 h32 M224 161 h22" stroke="#e2e8f0" stroke-width="7" stroke-linecap="round"/><circle cx="240" cy="207" r="17" fill="none" stroke="#60a5fa" stroke-width="5" stroke-dasharray="80 27"/>'
      : '<circle cx="240" cy="176" r="44" fill="none" stroke="#60a5fa" stroke-width="6" opacity=".65" stroke-dasharray="212 65" transform="rotate(-90 240 176)"/><path d="M213 148 L240 176 L267 161" fill="none" stroke="#f8fafc" stroke-width="5" stroke-linecap="round"/><circle cx="240" cy="176" r="5" fill="#93c5fd"/>';
    device = `<ellipse cx="240" cy="327" rx="91" ry="9" fill="#0f172a" opacity=".12" filter="url(#shadow)"/><g transform="rotate(-12 240 180)"><rect x="${band ? 208 : 197}" y="28" width="${band ? 64 : 86}" height="291" rx="24" fill="${tint}" stroke="#94a3b8" stroke-width="2"/><path d="M226 48 H254 M226 62 H254 M229 289 H251 M229 303 H251" stroke="#475569" stroke-width="4" stroke-linecap="round" opacity=".5"/>${band ? '' : '<rect x="315" y="148" width="11" height="24" rx="5" fill="url(#metal)"/>'}${face}${dial}</g>`;
  } else if (kind.startsWith('home-')) {
    const shadow = '<ellipse cx="240" cy="309" rx="114" ry="12" fill="#0f172a" opacity=".12" filter="url(#shadow)"/>';
    const shell = 'fill="url(#metal)" stroke="#94a3b8" stroke-width="2"';
    const shapes = {
      'home-camera': `<ellipse cx="240" cy="284" rx="85" ry="23" ${shell}/><rect x="170" y="151" width="140" height="130" rx="55" ${shell}/><circle cx="240" cy="140" r="85" ${shell}/><ellipse cx="240" cy="139" rx="65" ry="67" fill="#17253a"/><circle cx="240" cy="133" r="32" fill="#0f172a" stroke="#475569" stroke-width="7"/><circle cx="231" cy="124" r="11" fill="#60a5fa" opacity=".7"/><circle cx="240" cy="188" r="3" fill="#4ade80"/>`,
      'home-outdoor': `<path d="M184 245 L153 288 H237 L218 245" ${shell}/><path d="M163 112 L138 62 M317 112 L345 62" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round"/><rect x="121" y="99" width="238" height="153" rx="50" ${shell}/><rect x="256" y="108" width="91" height="135" rx="38" fill="#17253a"/><ellipse cx="302" cy="175" rx="29" ry="35" fill="#0f172a" stroke="#64748b" stroke-width="5"/><ellipse cx="296" cy="167" rx="10" ry="12" fill="#60a5fa"/>`,
      'home-plug': `<rect x="162" y="73" width="156" height="224" rx="42" ${shell}/><circle cx="240" cy="161" r="55" fill="#f8fafc" stroke="#cbd5e1" stroke-width="5"/><circle cx="218" cy="161" r="9" fill="#334155"/><circle cx="262" cy="161" r="9" fill="#334155"/><circle cx="240" cy="261" r="11" fill="none" stroke="#64748b" stroke-width="3"/><path d="M240 244 v13" stroke="#64748b" stroke-width="3"/>`,
      'home-bulb': `<path d="M210 213 Q205 187 180 156 A76 76 0 1 1 300 156 Q275 187 270 213Z" fill="${tint}" stroke="#94a3b8" stroke-width="2"/><path d="M210 210 H270 L263 272 Q240 313 217 272Z" ${shell}/><path d="M214 231 H266 M216 246 H264 M219 260 H261" stroke="#64748b" stroke-width="6"/><ellipse cx="221" cy="103" rx="17" ry="25" fill="#f8fafc" opacity=".65"/>`,
      'home-strip': `<ellipse cx="225" cy="168" rx="120" ry="86" fill="none" stroke="#e2e8f0" stroke-width="31"/><ellipse cx="225" cy="168" rx="120" ry="86" fill="none" stroke="${tint}" stroke-width="20"/><ellipse cx="225" cy="168" rx="120" ry="86" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="6 15"/><path d="M329 208 Q391 260 295 277" fill="none" stroke="#94a3b8" stroke-width="9"/><rect x="242" y="259" width="70" height="37" rx="12" ${shell}/>`,
      'home-motion': `<rect x="170" y="65" width="140" height="225" rx="50" ${shell}/><rect x="187" y="127" width="106" height="127" rx="38" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/><circle cx="240" cy="99" r="5" fill="#60a5fa"/>`,
      'home-contact': `<rect x="155" y="70" width="107" height="225" rx="30" ${shell}/><rect x="283" y="92" width="45" height="180" rx="19" ${shell}/><circle cx="210" cy="112" r="5" fill="#60a5fa"/><path d="M242 180 h-13 M293 180 h13" stroke="#94a3b8" stroke-width="3"/>`,
      'home-hub': `<rect x="157" y="67" width="166" height="230" rx="40" ${shell}/><circle cx="240" cy="157" r="49" fill="#dbe4ef" stroke="#94a3b8" stroke-width="2"/>${Array.from({length:7},(_,i)=>`<path d="M207 ${133+i*8} H273" stroke="#64748b" stroke-width="3" stroke-dasharray="2 6"/>`).join('')}<circle cx="240" cy="251" r="6" fill="#60a5fa"/>`,
    };
    device = shadow + shapes[kind];
  } else if (kind.startsWith('console')) {
    const shell = kind === 'console-ps'
      ? '<path d="M187 47 Q242 62 291 43 L300 290 Q244 316 178 289Z" fill="#1e293b"/><path d="M184 46 L200 56 L199 288 L177 302Z M280 49 L300 41 L315 298 L288 289Z" fill="url(#metal)" stroke="#cbd5e1" stroke-width="2"/><path d="M202 60 L202 283" stroke="#60a5fa" stroke-width="3"/>'
      : `<rect x="158" y="62" width="164" height="232" rx="9" fill="url(#metal)" stroke="#64748b"/><rect x="168" y="73" width="143" height="210" rx="4" fill="${kind === 'console-s' ? '#e2e8f0' : '#1e293b'}"/><circle cx="239" cy="139" r="47" fill="#111827"/><circle cx="293" cy="269" r="5" fill="#94a3b8"/>`;
    device = `<ellipse cx="240" cy="313" rx="109" ry="10" fill="#0f172a" opacity=".18" filter="url(#shadow)"/><g transform="rotate(-7 240 180)">${shell}</g>`;
  } else if (kind === 'handheld') {
    device = `<ellipse cx="240" cy="279" rx="168" ry="11" fill="#0f172a" opacity=".16" filter="url(#shadow)"/><g transform="rotate(-7 240 180)"><rect x="55" y="106" width="370" height="144" rx="32" fill="url(#metal)" stroke="#64748b"/><rect x="112" y="113" width="256" height="130" rx="5" fill="#0f172a"/><rect x="124" y="124" width="232" height="108" rx="3" fill="url(#screen)"/><path d="M145 210 Q227 105 337 150" fill="none" stroke="#93c5fd" stroke-width="14" opacity=".5"/><circle cx="83" cy="145" r="15" fill="#1e293b"/><path d="M83 184 v30 m-15 -15 h30" stroke="#334155" stroke-width="8"/><circle cx="397" cy="210" r="14" fill="#1e293b"/><g fill="#334155"><circle cx="394" cy="134" r="5"/><circle cx="383" cy="145" r="5"/><circle cx="405" cy="145" r="5"/><circle cx="394" cy="156" r="5"/></g></g>`;
  } else if (kind === 'gamepad') {
    device = `<ellipse cx="240" cy="292" rx="140" ry="12" fill="#0f172a" opacity=".16" filter="url(#shadow)"/><g transform="rotate(-9 240 180)"><path d="M151 104 Q119 106 106 153 L85 247 Q82 279 111 274 L172 218 H308 L369 274 Q398 279 395 247 L374 153 Q361 106 329 104Z" fill="url(#metal)" stroke="#64748b" stroke-width="2"/><path d="M171 115 H309 L290 176 H190Z" fill="#334155"/><circle cx="195" cy="205" r="20" fill="#1e293b" stroke="#64748b" stroke-width="4"/><circle cx="285" cy="205" r="20" fill="#1e293b" stroke="#64748b" stroke-width="4"/><path d="M148 133 v42 m-21 -21 h42" stroke="#334155" stroke-width="13"/><g fill="#334155"><circle cx="335" cy="135" r="8"/><circle cx="315" cy="155" r="8"/><circle cx="355" cy="155" r="8"/><circle cx="335" cy="175" r="8"/></g></g>`;
  } else if (kind === 'mouse') {
    device = `<ellipse cx="240" cy="310" rx="90" ry="10" fill="#0f172a" opacity=".15" filter="url(#shadow)"/><g transform="rotate(-17 240 180)"><path d="M239 65 C132 65 142 165 151 237 C162 313 320 313 329 229 C336 142 342 65 239 65Z" fill="url(#metal)" stroke="#475569" stroke-width="3"/><path d="M239 68 V190 M160 181 Q240 213 324 181" fill="none" stroke="#334155" stroke-width="5"/><rect x="228" y="103" width="22" height="49" rx="9" fill="#1e293b"/><path d="M206 237 L239 215 L270 237 L239 260Z" fill="none" stroke="#60a5fa" stroke-width="4"/></g>`;
  } else if (kind === 'headphones') {
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
// Uploaded filenames do not always match catalogue IDs; preserve the original
// files and map the visually checked models to their corresponding products.
const photoFiles = {
  'extra-06': 'extra-07',
  'extra-07': 'extra-06',
  'accessory-03': 'accessory-04',
  'accessory-04': 'accessory-03',
  'camera-01': 'camera-02',
  'camera-02': 'camera-01',
  'camera-03': 'camera-04',
  'camera-04': 'camera-06',
  'camera-05': 'camera-03',
  'camera-06': 'camera-05',
  'drone-08': 'drone-09',
  'drone-09': 'drone-08',
};
const assets = new URL('../public/assets/products/', import.meta.url);
await mkdir(assets, { recursive: true });
const categoryLabels = { smartphones: 'گوشی هوشمند', laptops: 'لپ‌تاپ و پی‌سی', audio: 'تجهیزات صوتی', gaming: 'گیمینگ و کنسول', 'smart-home': 'خانه هوشمند' };
const kindLabels = { phone: 'گوشی هوشمند', laptop: 'لپ‌تاپ', mini: 'مینی پی‌سی', desktop: 'آل‌این‌وان', headphones: 'هدفون', earbuds: 'هندزفری', 'earbuds-stem': 'هندزفری', speaker: 'اسپیکر', 'speaker-round': 'اسپیکر' };
Object.assign(kindLabels, { 'console-ps': 'کنسول', 'console-x': 'کنسول', 'console-s': 'کنسول', handheld: 'کنسول دستی', gamepad: 'کنترلر', mouse: 'ماوس گیمینگ' });
Object.assign(kindLabels, { 'home-camera': 'دوربین هوشمند', 'home-outdoor': 'دوربین فضای باز', 'home-plug': 'پریز هوشمند', 'home-bulb': 'لامپ هوشمند', 'home-strip': 'نوار نور', 'home-motion': 'سنسور حرکت', 'home-contact': 'سنسور در و پنجره', 'home-hub': 'هاب هوشمند' });
categoryLabels.wearables = 'پوشیدنی‌ها';
Object.assign(kindLabels, { 'watch-square': 'ساعت هوشمند', 'watch-round': 'ساعت هوشمند', 'fitness-band': 'مچ‌بند هوشمند' });
categoryLabels.accessories = 'لوازم جانبی';
Object.assign(kindLabels, { 'accessory-mouse': 'ماوس', 'accessory-keyboard': 'کیبورد', 'accessory-charger': 'شارژر', 'accessory-powerbank': 'پاوربانک', 'accessory-cable': 'کابل', 'accessory-ssd': 'حافظهٔ قابل‌حمل', 'accessory-hub': 'هاب USB-C' });
categoryLabels.cameras = 'دوربین و لنز';
Object.assign(kindLabels, { 'camera-kit': 'دوربین با لنز کیت', 'camera-body': 'بدنهٔ دوربین', 'camera-lens': 'لنز' });
categoryLabels.drones = 'پهپاد و کوادکوپتر';
categoryLabels.more = 'سایر دسته‌ها';
Object.assign(kindLabels, { 'extra-router': 'روتر', 'extra-mesh': 'شبکهٔ مش', 'extra-monitor': 'مانیتور', 'extra-printer': 'چاپگر', 'extra-projector': 'پروژکتور', 'extra-webcam': 'وب‌کم', 'extra-mic': 'میکروفون', 'extra-reader': 'کتاب‌خوان', 'extra-tablet': 'قلم نوری', 'extra-flash': 'فلش مموری' });
Object.assign(kindLabels, { 'drone-folding': 'پهپاد دوربین‌دار', 'drone-guarded': 'کوادکوپتر کامپکت' });
for (const [category, rows, prefix] of [['smartphones', phones, 'phone'], ['laptops', computers, 'computer'], ['audio', audio, 'audio'], ['gaming', gaming, 'gaming'], ['smart-home', smartHome, 'home'], ['wearables', wearables, 'watch'], ['accessories', accessories, 'accessory'], ['cameras', cameras, 'camera'], ['drones', drones, 'drone'], ['more', extras, 'extra']]) {
  for (const [index, row] of rows.entries()) {
    const [name, nameEn, brand, price, ...details] = row;
    const [first, second, third, tint, kind = 'phone'] = details;
    const id = `${prefix}-${String(index + 1).padStart(2, '0')}`;
    const kindLabel = kindLabels[kind];
    const imageId = photoFiles[id] ?? id;
    const extension = 'webp';
    products.push({ id, name, nameEn, brand, category, categoryFa: categoryLabels[category], kindLabel,
      price, rating: 0, reviewCount: 0, image: `/assets/products/${imageId}.${extension}`, specs: [first, second, third],
      description: `${name}؛ ${first}، ${second} و ${third}. پیکربندی و قیمت نمونه برای تست فروشگاه.`, inStock: true, demo: true });
    await writeFile(new URL(`${id}.svg`, assets), illustration(kind, tint, index), 'utf8');
  }
}
await writeFile(new URL('../backend/data/catalog-products.json', import.meta.url), JSON.stringify(products, null, 2) + '\n', 'utf8');
console.log(`Generated ${products.length} demo products and local SVG illustrations.`);
