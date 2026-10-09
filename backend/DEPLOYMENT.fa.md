# استقرار نسخهٔ دارای معماری لایه‌ای و کنترل‌های امنیتی

فرانت‌اند روی Vercel، بک‌اند FastAPI روی Render و PostgreSQL روی Neon یا سرور
مستقل قابل اجرا هستند. این فایل سرویس آنلاین ایجاد نمی‌کند. تنظیمات قبلی فقط با
`DATABASE_URL` دیگر برای Production کافی نیست.

## ارتقای سایت موجود

از دیتابیس backup بگیرید و بازیابی آن را روی دیتابیس جدا امتحان کنید. migration
`0003` نشست‌های قبلی را باطل می‌کند، برای کاربران رمزدار تأیید ایمیل لازم می‌شود
و سفارش‌های قدیمیِ پرداخت‌نشده را برای آزادسازی موجودی به worker می‌سپارد.
سفارش پرداخت‌شده نباید در دیتابیس با وضعیت `pending_payment` باقی مانده باشد.

Backend و Frontend را هماهنگ منتشر کنید؛ `currentPassword` اکنون الزامی است و
ثبت‌نام پاسخ عمومی 202 می‌دهد و خودکار وارد حساب نمی‌شود.

## دیتابیس با دو حساب جدا

- `nexora_migrator`: مالک جدول‌های Nexora و اجراکنندهٔ Alembic.
- `nexora_app`: حساب API و worker، بدون superuser/createdb/createrole/bypassrls،
  بدون مالکیت جدول‌ها یا اجازهٔ ساخت آبجکت در schema.

برای دیتابیس تازه، با حساب مدیریتی `scripts/provision.sql` را از psql اجرا کنید.
این اسکریپت رمز دو role را با `\password` می‌پرسد. ساخت جدول‌ها فقط با Alembic است.
در دیتابیس موجود، مالکیت **جدول‌ها و sequenceهای همین پروژه** باید به migrator
منتقل شود. `REASSIGN OWNED` را بدون بررسی اجرا نکنید؛ ممکن است آبجکت‌های دیگری
را تغییر دهد. عضویت در roleهای مدیریتی سرویس مدیریت‌شده را هم بررسی کنید؛ صرفاً
متفاوت بودن نام کاربر، محدود بودن دسترسی را ثابت نمی‌کند.

URL معمول Neon مانند `postgresql://USER:PASSWORD@HOST/neondb?sslmode=require`
است. TLS را حفظ کنید؛ در صورت پشتیبانی ارائه‌دهنده، `sslmode=verify-full` را هم
تنظیم کنید. برای migration از اتصال مستقیم مناسب DDL استفاده کنید و محدودیت‌های
pooler سرویس را بررسی کنید.

## متغیرهای بک‌اند Render

`render.yaml` سرویس Docker موجود را نگه می‌دارد. این مقادیر باید فقط در محیط
بک‌اند باشند؛ هیچ‌کدام را در `VITE_...` یا Git قرار ندهید:

| متغیر | مقدار/هدف |
|---|---|
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | اتصال role محدود برنامه |
| `MIGRATION_DATABASE_URL` | اتصال role مالک migration |
| `SECRET_KEY` | تصادفی، حداقل ۳۲ کاراکتر؛ در انتشار بعدی حفظ شود |
| `REDIS_URL` | Redis مشترک؛ برای اتصال اینترنتی TLS با `rediss://` و ACL |
| `FRONTEND_URL` | `https://nexora-digital-shop.vercel.app` بدون path |
| `RESEND_API_KEY` | کلید خصوصی ایمیل |
| `MAIL_FROM` | فرستنده از دامنهٔ تأییدشدهٔ Resend |
| `REQUIRE_VERIFIED_EMAIL` | `true`، مقدار پیش‌فرض |
| `RUN_WORKER` | `true` برای worker در پردازش جدا در همین سرویس |
| `GOOGLE_CLIENT_ID` | اختیاری، OAuth Web Client ID |

ساخت secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
کلید توسعه را استفاده نکنید. تغییر ناگهانی SECRET_KEY، CSRF و رمزگشایی ایمیل‌های
در صف را مختل می‌کند؛ چرخش آن نیازمند برنامهٔ مهاجرت کلید و صف است.

Redis در Production اجباری است؛ خرابی آن برای درخواست‌های محدودشونده پاسخ 503
می‌دهد و fallback حافظه‌ای نداریم. Redis اختصاصی/namespace مناسب، TLS و ACL فقط
برای کلیدهای `nexora:rate:*` و فرمان‌های موردنیاز Lua، INCR و EXPIRE تنظیم کنید.

`start.py` migration، seed و grantهای محدود را اجرا می‌کند، credential مهاجرت
را از محیط فرزندان حذف می‌کند و دو پردازش API/worker را نظارت می‌کند. با مرگ هر
یک، دیگری متوقف می‌شود تا میزبان سرویس را مجدد راه‌اندازی کند. credential مهاجرت
هنوز در محیط supervisor است؛ برای جداسازی کامل، migration را در job جدا اجرا کنید:

```text
alembic upgrade head
python -m app.seed
```

سپس `scripts/grants.sql` را با psql و role مالک اجرا کنید. در runtime
`MIGRATE_ON_START=false` بگذارید و credential مهاجرت را اصلاً به آن ندهید.
چند replica نباید هم‌زمان migration اجرا کنند؛ migration job باید یک اجراکننده داشته باشد.

## worker و ایمیل

صف ایمیل در PostgreSQL است تا تغییر حساب و ثبت ایمیل در یک تراکنش commit شوند.
payload صف رمزنگاری می‌شود؛ worker با lease و `FOR UPDATE SKIP LOCKED` کار می‌کند،
حداکثر شش تلاش با فاصلهٔ افزایشی انجام می‌دهد و خطاهای نهایی را با `failed_at`
نگه می‌دارد. ارسال Resend کلید idempotency دارد؛ موفقیت ارسال، payload را پاک
می‌کند. raw token رمزنگاری‌شده در صف، با hash در جدول توکن متفاوت است.

برای worker مستقل، `RUN_WORKER=false` روی web و دستور
`python -m app.infrastructure.worker` روی worker بگذارید. همان DATABASE_URL محدود
و SECRET_KEY لازم است. worker هم ایمیل‌ها را پردازش می‌کند و هم موجودی رزروهای
منقضی را آزاد می‌کند؛ خاموش بودن آن باعث تأخیر در هر دو کار می‌شود.

طبق [مستندات Render Free](https://render.com/docs/free)، سرویس رایگان ممکن است
در بی‌کاری بخوابد. worker داخل همان سرویس هم در زمان خواب اجرا نمی‌شود. برای دمو،
پس از بیدارشدن کارهای عقب‌افتاده پردازش می‌شوند؛ برای فروشگاه واقعی، worker
همیشه‌فعال و پایش صف لازم است. هیچ سرویس یا پلن پولی در این تغییرات ساخته نشده است.

`email_outbox` را از نظر `failed_at`، retry و سن قدیمی‌ترین pending پایش کنید.
replay لینک منقضی مفید نیست؛ پس از رفع علت، درخواست جدید ایجاد کنید. سیاست حذف
رکوردهای تکمیل‌شده، نشست‌های منقضی و نگه‌داری audit را متناسب با نیاز عملیاتی تعریف کنید.

## Vercel، دامنه، CORS و Google

تنظیم فعال فرانت‌اند **vercel.json** است. اولین rewrite مسیر `/api/:path*` را
به Render می‌برد؛ اگر میزبان بک‌اند عوض شد، destination همین rewrite را تغییر دهید.
متغیر قدیمی `NEXORA_API_ORIGIN` در این JSON خوانده نمی‌شود. Root Directory ریشهٔ
ریپو، build برابر `npm run build` و output برابر `dist` است.

دامنه به فرانت‌اند/API وصل می‌شود؛ خرید دامنه نیازی به انتقال PostgreSQL از Neon
ندارد. انتقال احتمالی دیتابیس نیازمند backup/restore و تغییر URLهای بک‌اند، همراه
بررسی TLS، داده‌ها و migration است. فرانت‌اند نباید URL دیتابیس را بداند.

در مرورگر، API را همان `/api` نگه دارید. CORS پیش‌فرض بسته است؛ در صورت نیاز فقط
originهای دقیق را در `ALLOWED_ORIGINS` وارد کنید. کوکی Strict برای پراکسی same-origin
طراحی شده و صرفاً باز کردن CORS، ورود cross-site را فعال نمی‌کند.

برای IP واقعی، فقط پس از بررسی رفتار ingress، `TRUSTED_PROXY_HEADER` و
`TRUSTED_PROXY_PEERS` را تنظیم کنید. زنجیره از راست به چپ تا اولین hop نامطمئن
خوانده می‌شود. پیش‌فرض به header کاربر اعتماد ندارد؛ بدون تنظیم ingress ممکن
است چند کاربر پشت proxy سهمیهٔ IP مشترک داشته باشند. محدودهٔ عمومی `0.0.0.0/0`
را به‌عنوان proxy مطمئن تعریف نکنید.

Google Client ID باید origin فرانت‌اند را در Google Console مجاز کند. CSP برای
Google Identity، فونت‌های Google، تصاویر مشخص و فایل‌های سایت نوشته شده؛ script
wildcard، unsafe-eval و unsafe-inline ندارد. inline-style برای motion React باقی
است. Headerها و ورود Google را بعد از استقرار روی دامنهٔ واقعی بررسی کنید.

## کنترل پس از انتشار

- `/health` فقط زنده بودن API را می‌سنجد؛ سلامت Redis/DB/worker را ثابت نمی‌کند.
- `/api/products` باید JSON باشد؛ `/api/auth/me` قبل از ورود باید 401 باشد.
- ثبت‌نام، دریافت واقعی ایمیل، تأیید لینک و سپس سفارش را امتحان کنید.
- تغییر رمز غلط/درست و خروج نشست دستگاه دوم را بررسی کنید.
- انقضای سفارش باید موجودی را دقیقاً یک بار آزاد کند؛ پرداخت واقعی هنوز متصل نیست.
- تأیید پرداخت فقط مدیریت و permission مخصوص می‌خواهد؛ آن را webhook عمومی
  درگاه فرض نکنید. role مدیر به هیچ کاربری خودکار داده نمی‌شود.
- تست نفوذ، هم‌زمانی PostgreSQL، بازیابی backup و هشدارهای worker هنوز جزو پذیرش
  عملیاتی Production هستند. گزارش کد و تست جایگزین این بررسی‌ها نیست.
