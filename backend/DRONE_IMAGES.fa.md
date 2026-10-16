# تصاویر پهپاد و کوادکوپتر

صفحه: `/category/drones`. نه مدل با قیمت نمونه برای تست فروشگاه وجود دارند.
هر نه عکس متصل‌اند. نگاشت فعلی فایل‌ها در `public/assets/products/`:

| نام فایل | مدل دقیق برای جست‌وجو |
| --- | --- |
| `drone-01.webp` | DJI Mini 4 Pro — خاکستری |
| `drone-02.webp` | DJI Mini 3 — خاکستری، نسخهٔ معمولی نه Pro |
| `drone-03.webp` | DJI Mini 4K — خاکستری، نه Mini 2 SE |
| `drone-04.webp` | DJI Air 3 — خاکستری |
| `drone-05.webp` | DJI Air 3S — خاکستری |
| `drone-06.webp` | DJI Neo — نسل اول، نه Neo 2 |
| `drone-07.webp` | DJI Flip — بازوها و محافظ ملخ‌ها باز |
| `drone-09.webp` | DJI Avata 2 — نه Avata نسل اول |
| `drone-08.webp` | Autel EVO Nano+ — نارنجی، نسخهٔ Plus |

عکس مناسب کارت: نمای سه‌رخ از جلو و کمی بالا، چهار بازو و تمام ملخ‌ها داخل کادر،
لنز دوربین قابل‌دیدن، زمینهٔ سفید و سایهٔ بسیار ملایم. برای مدل‌های تاشو بازوها باز
باشند. برای Neo، Flip و Avata 2 شکل محافظ‌های اصلی حفظ شود. عکس بدون جعبه، دست،
واترمارک، کنترلر، عینک FPV یا مجموعهٔ باتری‌ها باشد؛ فقط خود پهپاد در مرکز کادر.
نسبت پیشنهادی ۴:۳ و اندازهٔ ۱۲۰۰×۹۰۰ پیکسل است؛ اطراف ملخ‌ها حاشیه باقی بگذارید.

برای تصاویر کارت‌ها لازم نیست خودتان پس‌زمینه را شفاف کنید؛ سفید یکدست مناسب است.
اگر فایل اصلی JPG یا PNG است، نام پایه را رعایت کنید و پسوند واقعی را نگه دارید.
صرف تغییر پسوند به WebP تبدیل فرمت نیست؛ هنگام اتصال عکس‌ها تبدیل و بهینه می‌شوند.

فایل‌های ۰۸ و ۰۹ جابه‌جا نام‌گذاری شده بودند؛ `photoFiles` در
`scripts/build-demo-catalog.mjs` آن‌ها را به محصول متناظر وصل می‌کند.
مدل EVO Lite+ با شناسهٔ `drone-10` به درخواست کاربر از کاتالوگ حذف شده است.
این شناسه در `backend/app/domain/catalog.py` بازنشسته شده تا رکورد دیتابیس قدیمی
در فهرست، جست‌وجو یا خرید جدید ظاهر نشود؛ سوابق سفارش‌های قبلی حفظ می‌شوند.
عکس تازه‌ای برای این مدل لازم نیست. فایل تکراری قبلی در سایت استفاده نمی‌شود.
نه مسیر WebP در `backend/data/catalog-products.json` ثبت شده‌اند. seed فقط
مسیر SVG اولیه را ارتقا می‌دهد؛ قیمت، موجودی و عکس سفارشی فروشنده حفظ می‌شود.

هیرو: `public/assets/category-heroes/drones.webp`، تصویر تولیدشدهٔ بدون برند و با
پس‌زمینهٔ شفاف است؛ جایگزین عکس مدل دقیق محصولات نیست. قیمت‌ها نمونه‌اند؛ پیش از
عرضهٔ واقعی، نوع پکیج، کنترلر و اقلام همراه هر محصول باید مشخص شود.

منابع مشخصات پایه و مرجع تشخیص ظاهر مدل‌ها:

- [DJI Mini 4 Pro](https://www.dji.com/mini-4-pro/specs)
- [DJI Mini 3](https://www.dji.com/mini-3/specs)
- [DJI Mini 4K](https://www.dji.com/mini-2-se/specs)
- [DJI Air 3](https://www.dji.com/air-3/specs)
- [DJI Air 3S](https://www.dji.com/air-3s/specs)
- [DJI Neo](https://www.dji.com/neo/specs)
- [DJI Flip](https://www.dji.com/flip/specs)
- [DJI Avata 2](https://www.dji.com/avata-2/specs)
- [Autel EVO Nano+](https://shop.autelrobotics.com/products/drones-evo-nano-plus)
- [Autel EVO Lite+](https://shop.autelrobotics.com/products/drones-evo-lite-plus)
