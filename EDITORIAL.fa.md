# مجلهٔ فناوری

چهار کارت صفحهٔ اصلی به مقاله‌های مستقل React Router متصل‌اند:

- `/magazine/productive-desk-setup`
- `/magazine/four-everyday-gadgets`
- `/magazine/thoughtful-smart-home`
- `/magazine/gaming-technology-2025`

صفحهٔ همهٔ مقاله‌ها `/magazine` است. فرادادهٔ سبک در
`src/data/article-index.js` و متن تألیفی فارسی در `src/data/article-content.js`
قرار دارد. متن مقاله‌ها با route جداگانه بارگذاری می‌شود و به پاسخ API محصولات وابسته نیست.
منابع رسمی کنار بخش مرتبط لینک شده‌اند؛ متن‌ها کپی یا ترجمهٔ کامل مقالهٔ دیگری نیستند.
مقالهٔ ۲۰۲۵ مرور تاریخی است و ادعای خبر روز یا آزمون عملی محصول ندارد.
تصاویر محلی موجود، برای فضاسازی و نمایش محصول استفاده شده‌اند.

صفحات دارای فهرست مطالب، چک‌لیست، مقاله‌های مرتبط، حالت تاریک و روشن،
متن راست‌چین، ابعاد مشخص تصاویر و بارگذاری تنبل تصاویر داخلی‌اند.
عنوان، توضیح، canonical، Open Graph و Article JSON-LD در کلاینت به‌روز می‌شوند.
SSR یا prerender اضافه نشده؛ پیش‌نمایش شبکه‌های اجتماعی که جاوااسکریپت اجرا
نمی‌کنند همچنان ممکن است فرادادهٔ عمومی `index.html` را بخوانند.

بررسی‌ها:

```powershell
node --test scripts/editorial.test.mjs scripts/catalog.test.mjs
npm run lint
npm run build
# با API محلی و Vite روی پورت 3002:
node scripts/check-editorial.mjs
```
