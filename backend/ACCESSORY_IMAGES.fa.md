# تصاویر لوازم جانبی

مسیر صفحه: `/category/accessories`. ده محصول با قیمت نمونه برای تست ثبت شده‌اند.
عکس‌ها را با نام دقیق زیر در `public/assets/products/` قرار دهید:

| محصول | نام فایل |
| --- | --- |
| Logitech MX Master 3S | `accessory-01.webp` |
| Logitech Pebble Mouse 2 M350s | `accessory-02.webp` |
| Logitech Pebble Keys 2 K380s | `accessory-03.webp` |
| Logitech MX Keys Mini | `accessory-04.webp` |
| Anker 511 Charger Nano 3 30W A2147 | `accessory-05.webp` |
| Anker 737 Power Bank 24K A1289 | `accessory-06.webp` |
| Apple 20W USB-C Power Adapter | `accessory-07.webp` |
| Apple 60W USB-C Charge Cable 1m | `accessory-08.webp` |
| Samsung Portable SSD T7 Shield 1TB | `accessory-09.webp` |
| UGREEN Revodok 105 5-in-1 USB-C Hub | `accessory-10.webp` |

تصاویر کارت‌ها: زمینهٔ سفید، سایهٔ بسیار ملایم، نسبت ۴:۳ و ترجیحاً ۱۲۰۰×۹۰۰.
تمام محصول، کابل متصل یا دوشاخه در کادر باشد؛ بدون جعبه، دست و واترمارک.
برای کیبوردها چیدمان انگلیسی انتخاب کنید. نسل و ظرفیت دقیق مدل‌ها رعایت شود.
برای شارژرها هنگام عرضه، نوع دوشاخه و سازگاری برق را مشخص کنید؛ توان نهایی
شارژ به دستگاه، کابل و آداپتور سازگار وابسته است. قیمت‌های سایت قیمت روز نیستند.
تغییر پسوند JPEG به WebP کافی نیست؛ تصویر باید واقعاً به WebP تبدیل شود.

فعلاً کارت‌ها به SVGهای محلی اشاره می‌کنند. پس از آماده‌شدن عکس‌ها، مسیر
در `scripts/build-demo-catalog.mjs` و داده‌های تولیدشده، به‌علاوهٔ فهرست
`PHOTO_PRODUCT_IDS` در `backend/app/seed.py` به‌روز می‌شود؛ مکانیزم فعلی
seed فقط تصویر جایگزین اولیه را تغییر می‌دهد و قیمت و موجودی حفظ می‌شود.
هیرو تصویر نمایشی بدون برند از هاب USB-C است و عکس محصول مشخصی محسوب نمی‌شود.

منابع مشخصات پایه:

- [Logitech MX Master 3S](https://support.logi.com/hc/pt-br/articles/5218070669847-Specification-MX-Master-3S)
- [Logitech Pebble Mouse 2](https://www.logitech.com/en-ae/products/mice/pebble-2-m350s-wireless-mouse.html)
- [Logitech Pebble Keys 2](https://support.logi.com/hc/en-us/articles/16707288345751-Do-I-need-to-pair-the-Pebble-Keys-2-K380s-and-the-Pebble-Mouse-2-M350s-individually)
- [Logitech MX Keys Mini](https://www.logitech.com/en-us/shop/p/mx-keys-mini.920-010474)
- [Anker Nano 30W](https://www.anker.com/products/a2147)
- [Anker 737](https://service.anker.com/au/article-description/Introduction-to-the-Anker-737-Power-Bank-24K-A1289)
- [Apple 20W](https://www.apple.com/shop/product/mwvv3am/a/20w-usb-c-power-adapter)
- [Apple USB-C Cable 60W](https://www.apple.com/shop/product/mw493am/a/60w-usb-c-charge-cable-1-m)
- [Samsung T7 Shield](https://www.samsung.com/us/memory-storage/portable-ssd/portable-ssd-t7-shield-usb-3-2-1tb-blue-sku-mu-pe1t0r-am/)
- [UGREEN Revodok 105](https://www.ugreen.com/en-au/products/au-15495)
