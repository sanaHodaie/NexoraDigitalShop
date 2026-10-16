# تصاویر دوربین و لنز

صفحه: `/category/cameras`. شش دوربین و چهار لنز با قیمت نمونهٔ آزمایشی اضافه شده‌اند.
هر ده عکس متصل‌اند. نگاشت فعلی فایل‌های آپلودشده در `public/assets/products/`:

| نام فایل | مدل دقیق برای جست‌وجوی عکس |
| --- | --- |
| `camera-02.webp` | Canon EOS R50 Black + RF-S 18-45mm F4.5-6.3 IS STM |
| `camera-01.webp` | Canon EOS R10 Black + RF-S 18-45mm F4.5-6.3 IS STM |
| `camera-04.webp` | Sony ZV-E10 Black + E PZ 16-50mm F3.5-5.6 OSS |
| `camera-06.webp` | Sony Alpha a6400 Black + E PZ 16-50mm F3.5-5.6 OSS |
| `camera-03.webp` | Nikon Z50 Black + NIKKOR Z DX 16-50mm f/3.5-6.3 VR |
| `camera-05.webp` | Fujifilm X-S20 Black — Body Only |
| `camera-07.webp` | Canon RF 50mm F1.8 STM |
| `camera-08.webp` | Sony FE 50mm F1.8 — SEL50F18F |
| `camera-09.webp` | Sigma 30mm F1.4 DC DN Contemporary — Sony E mount |
| `camera-10.webp` | Nikon NIKKOR Z 40mm f/2 — standard version |

عکس‌ها ترجیحاً ۱۲۰۰×۹۰۰ با نسبت ۴:۳، پس‌زمینهٔ سفید، محصول در مرکز با حاشیهٔ
یکسان و سایهٔ بسیار ملایم باشند. نمای سه‌رخ جلو با کل بدنه و شیشهٔ لنز در کادر
مناسب است. جعبه، دست، نوشتهٔ تبلیغاتی یا واترمارک نباشد.

پنج دوربین اول با همان لنز کیت در عکس باشند. X-S20 فقط بدنه، بدون لنز است.
ZV-E10 را با ZV-E10 II و Z50 را با Z50 II اشتباه نگیرید. لنز Canon از نوع RF است،
نه EF؛ لنز سونی FE 50mm با E 50mm OSS فرق دارد. برای سیگما نسخهٔ Sony E را
انتخاب کنید و برای نیکون ۴۰ میلی‌متر نسخهٔ معمولی، نه SE. مانت لنزها یکسان نیست؛
قبل از خرید، سازگاری با بدنه باید بررسی شود.

تغییر پسوند JPG/PNG به WebP تبدیل فرمت نیست. اگر WebP ندارید، فایل اصلی را با
همین نام پایه و پسوند واقعی قرار دهید تا هنگام اتصال تبدیل و بهینه شود.

شمارهٔ شش فایل اول با ترتیب محصولات متفاوت بود؛ نگاشت `photoFiles` در
`scripts/build-demo-catalog.mjs` آن‌ها را به مدل متناظر وصل می‌کند، بدون تغییر فایل اصلی.
مسیرهای WebP در `backend/data/catalog-products.json` ثبت شده‌اند و اجرای seed
در `backend/app/seed.py` مسیر SVG اولیه را ارتقا می‌دهد. قیمت، موجودی و عکس سفارشی حفظ می‌شود.

هیرو از `public/assets/category-heroes/cameras.webp` استفاده می‌کند: تصویر تولیدشدهٔ
بدون برند با آلفای شفاف، جدا از عکس مدل‌های واقعی کارت‌ها.

منابع مشخصات پایه (قیمت‌ها نمونه‌اند و از این صفحات برداشت نشده‌اند):

- [Canon EOS R50](https://cam.start.canon/en/C011/manual/html/UG-11_Reference_0090.html)
- [Canon EOS R10](https://www.usa.canon.com/support/p/eos-r10)
- [Sony ZV-E10](https://helpguide.sony.net/ilc/2070/v1/en/contents/TP1000201578.html)
- [Sony a6400](https://sonyglobal.akamaized.net/is/content/gwtvid/pdf/2019/ILCE-6400/PG_Printing_Data_350dpi.pdf)
- [Nikon Z50](https://www.nikonusa.com/press-room/nikon-z-50)
- [Fujifilm X-S20](https://www.fujifilm-x.com/en-us/products/cameras/x-s20/specifications/)
- [Canon RF 50mm](https://downloads.canon.com/nw/lens/rf50mm/RF50mm_F1.8_specifications.pdf)
- [Sony FE 50mm](https://www.sony.co.uk/electronics/camera-lenses/sel50f18f)
- [Sigma 30mm](https://www.sigma-global.com/en/lenses/c016_30_14/)
- [Nikon Z 40mm](https://www.nikonusa.com/p/nikkor-z-40mm-f2/20102/overview)
