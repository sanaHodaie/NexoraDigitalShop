# انتقال بات از پاورشل به Webhook

این راهنما برای بات `@NexoraShopHelperBot` و معماری فعلی فروشگاه است:
بک‌اند Render، دیتابیس Neon و فرانت‌اند Vercel. Webhook آماده است؛ انتشار سرویس و ثبت Webhook مراحل جداگانه‌اند.

## ۰. انتخاب پلن و دریافت کد

پلن رایگان Hobby در Vercel برای پروژه‌های شخصی/غیرتجاری است؛ برای فروشگاه واقعی نباید مناسب‌بودن این پلن را فرض کرد.
شرایط جاری را در [Vercel Hobby](https://vercel.com/docs/plans/hobby) بررسی کنید.

- برای پروژهٔ شخصی/آزمایشی: یک پروژهٔ **جدا** در Vercel با Root Directory برابر `telegram_bot` بسازید.
- برای پروژهٔ تجاری با بودجهٔ صفر: سرویس Webhook جدا روی Render را می‌توان بررسی کرد. رایگان بودن شامل محدودیت خواب، منابع و سهمیهٔ حساب است؛ پاسخ سریع و همیشگی تضمین نمی‌شود.
- کد برای هر دو مقصد یکی است؛ فایل `telegram_bot/render.yaml` نمونهٔ تنظیمات Render است. فایل Render ریشهٔ مخزن مربوط به بک‌اند فروشگاه است و در این تغییر عوض نشده است.

در VS Code، بات محلی را با `Ctrl+C` متوقف کنید و اجرا کنید:

```powershell
cd D:\nexoraShop
git pull --ff-only origin main
cd telegram_bot
uv sync --frozen
```

فایل `.env` موجود خود را بازنویسی نکنید. توکن را در چت، گیت یا اسکرین‌شات قرار ندهید.
Hiddify/پراکسی محلی برای فرمان‌های تلگرام روی کامپیوتر شما می‌تواند روشن بماند؛ روی میزبان نباید آدرس `127.0.0.1:12334` تنظیم شود.

## ۱. آماده‌کردن فضای مستقل بات در Neon

بات از جدول‌های حساب‌ها و سفارش‌های سایت استفادهٔ مستقیم نمی‌کند. یک schema مستقل به نام `nexora_bot` می‌سازد.
در همان دیتابیس یا یک دیتابیس جدا در پروژهٔ Neon، با کاربر مالک/مهاجرت وارد SQL Editor شوید.
یک نقش محدود مخصوص بات بسازید؛ مقدار رمز نمونه را **همان‌جا** با رمز خصوصی خود جایگزین کنید:

```sql
CREATE ROLE nexora_bot_app LOGIN PASSWORD 'REPLACE_WITH_YOUR_PRIVATE_RANDOM_PASSWORD'
NOSUPERUSER NOCREATEDB NOCREATEROLE;
```

این مرحله را برای نقش از قبل ساخته‌شده دوباره اجرا نکنید. رمز را URL-encode کنید اگر URL اتصال را دستی می‌سازید.

در `telegram_bot/.env` محلی، موقتاً آدرس اتصال **مالک/مهاجرت** Neon را اضافه کنید:

```dotenv
BOT_MIGRATION_DATABASE_URL=postgresql://MIGRATION_OWNER:PRIVATE_PASSWORD@NEON_HOST/neondb?sslmode=require
```

سپس از پوشهٔ `telegram_bot`:

```powershell
uv run --frozen python setup_database.py --runtime-role nexora_bot_app
```

باید پیام `Bot schema and runtime grants are ready` نمایش داده شود.
این دستور تکرارپذیر است و جدول‌های فروشگاه را تغییر نمی‌دهد.
مالک/کلید مهاجرت را در تنظیمات runtime میزبان وارد نکنید؛ فقط برای آماده‌سازی محلی لازم است.

آدرس اتصال نقش `nexora_bot_app` را با **Pooled connection** از Neon آماده کنید:

```dotenv
BOT_DATABASE_URL=postgresql://nexora_bot_app:PRIVATE_URL_ENCODED_PASSWORD@YOUR_ENDPOINT-pooler.YOUR_REGION.aws.neon.tech/neondb?sslmode=require
```

این URL نمونه است؛ host/database واقعی را از پروژهٔ خود بگیرید. پارامترهای TLS موجود را حذف نکنید.
نقش بات فقط باید به schema خودش دسترسی داشته باشد. برای این مرحله نیازی به ارسال URL یا رمز برای دستیار نیست.

## ۲. ساخت کلید Webhook

روی کامپیوتر خود اجرا کنید:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

خروجی را فقط در `.env` محلی و تنظیمات امن میزبان با نام `WEBHOOK_SECRET` ذخیره کنید.
این مقدار با `BOT_TOKEN` و `TELEGRAM_BOT_API_KEY` فرق دارد. هر دو محل باید دقیقاً همان مقدار را داشته باشند.

## ۳. تنظیم متغیرهای پروژهٔ میزبانی بات

| نام | مقدار |
|---|---|
| `BOT_TOKEN` | توکن فعلی بات، بدون ارسال در چت |
| `WEBHOOK_SECRET` | کلید تصادفی مرحلهٔ ۲ |
| `BOT_DATABASE_URL` | URL اتصال محدود و pooled بات در Neon |
| `NEXORA_API_URL` | `https://nexora-api-s2q3.onrender.com`؛ اگر دامنهٔ واقعی بک‌اند فرق دارد، مقدار درست را وارد کنید |
| `FRONTEND_URL` | `https://nexora-digital-shop.vercel.app`؛ مطابق دامنهٔ واقعی سایت |
| `TELEGRAM_BOT_API_KEY` | فقط اگر اتصال حساب سایت فعال است: همان کلید مشترکِ تنظیم‌شده در بک‌اند |

`PROXY_URL` را روی میزبان حذف/خالی کنید. آدرس localhost شما از داخل سرور قابل‌دسترسی نیست.
`BOT_MIGRATION_DATABASE_URL`، رمز مالک Neon و اطلاعات غیرمرتبط سایت را به پروژهٔ بات اضافه نکنید.
متغیرها را برای Production فعال کنید؛ پس از هر تغییر متغیر، Redeploy کنید.

## ۴الف. انتشار جدا در Vercel برای پروژهٔ واجد شرایط

1. در Vercel: Add New → Project → انتخاب همین مخزن GitHub.
2. نام پروژه مثلاً `nexora-telegram-bot`؛ پروژهٔ فعلی فرانت‌اند را ویرایش نکنید.
3. Root Directory: `telegram_bot`؛ Framework Preset: **Other**.
4. Build Command و Output Directory را با مقدار پروژهٔ Vite پر نکنید؛ فایل `telegram_bot/vercel.json` تابع Python و مسیرهای Webhook را تعریف می‌کند.
5. متغیرهای مرحلهٔ ۳ را وارد کنید و Deploy بزنید. Python در `.python-version` روی خانوادهٔ 3.12 تنظیم شده است.
6. در صورت وجود Deployment Protection، دامنهٔ Production باید برای مسیر Webhook بدون ورود Vercel قابل‌دسترسی باشد. امنیت درخواست با کلید Telegram Webhook بررسی می‌شود.
7. آدرس عمومی Production را یادداشت کنید؛ از لینک موقت Preview برای ثبت بات استفاده نکنید.

بهتر است محل اجرای تابع به منطقهٔ Neon نزدیک باشد، در حد انتخاب‌های مجاز پلن؛ نیازی به جابه‌جایی دادهٔ فعلی برای این مرحله نیست.

## ۴ب. انتشار جدا در Render

New → Web Service → همین مخزن. تنظیمات:

```text
Root Directory: telegram_bot
Runtime: Python
Build Command: pip install uv==0.12.23 && uv sync --frozen --no-dev
Start Command: uv run --frozen --no-dev uvicorn webhook_app:app --host 0.0.0.0 --port $PORT
Health Check: /health
```

متغیرهای مرحلهٔ ۳ را وارد کنید و سرویس را منتشر کنید. در صورت ارائهٔ پلن Free، محدودیت آن و سهمیهٔ مشترک حساب با بک‌اند را بررسی کنید.
سرویس موجود `nexora-api` را با این تنظیمات جایگزین نکنید.
سرویس رایگان ممکن است بخوابد؛ Telegram می‌تواند تحویل ناموفق را مجدداً تلاش کند، اما تأخیر اولیه ممکن است زیاد باشد.

## ۵. بررسی مقصد قبل از اتصال تلگرام

در `.env` محلی، `BOT_TOKEN`، `WEBHOOK_SECRET` و در صورت نیاز `PROXY_URL` Hiddify خود را داشته باشید.
آدرس زیر را با دامنهٔ Production خود جایگزین کنید:

```powershell
uv run --frozen python manage_webhook.py check --url https://YOUR-BOT-HOST/api/telegram
```

این فرمان فقط `/health`، رد درخواست بدون کلید و رسیدن درخواست خالی با کلید صحیح به اعتبارسنجی را بررسی می‌کند.
هیچ پیام چتی نمی‌فرستد و Webhook را تغییر نمی‌دهد. پیام موفقیت:

```text
Public webhook health, authentication and secret binding OK; no chat message sent.
```

اگر redirect، صفحهٔ ورود Vercel، 404 یا خطای کلید دیدید، ابتدا انتشار/دامنه/متغیرها را اصلاح کنید؛ هنوز بات را فعال نکنید.

## ۶. فعال‌سازی Webhook

مطمئن شوید ترمینال قبلی `main.py` و هر نسخهٔ polling دوستتان متوقف‌اند.
سپس روی کامپیوتر خود:

```powershell
uv run --frozen python manage_webhook.py set --url https://YOUR-BOT-HOST/api/telegram
uv run --frozen python manage_webhook.py status
```

فرمان `set` بررسی مرحلهٔ قبل را دوباره انجام می‌دهد، کلید مخفی هدر را ثبت می‌کند، فقط message/callback_query را می‌پذیرد و پیام‌های در صف را حذف نمی‌کند.
برای شروع، `max_connections=1` است تا ترتیب تعامل‌های بات حفظ شود؛ افزایش هم‌زمانی بعداً به بررسی بار و ترتیب پیام‌های یک کاربر نیاز دارد.
توکن در URL ترمینال یا خروجی چاپ نمی‌شود.

اکنون `main.py` را اجرا نکنید. Hiddify کامپیوتر شما هم برای میزبانی آنلاین لازم نیست.

## ۷. تست نهایی بدون پاورشل

1. ترمینال بات محلی را ببندید.
2. در تلگرام `/start` → «شروع» → یک دسته → یک محصول را امتحان کنید.
3. قیمت/موجودی را با سایت تطبیق دهید؛ جست‌وجو و مقایسهٔ دو محصول را انجام دهید.
4. زبان را تغییر دهید و چند دقیقه بعد دوباره بات را امتحان کنید؛ انتخاب‌ها باید از Neon خوانده شوند.
5. چند دقیقه بات را استفاده نکنید و اولین پاسخ بعدی را هم بسنجید. خواب Render/Neon می‌تواند باعث تأخیر شود؛ انتقال Webhook این محدودیت بک‌اند را حذف نمی‌کند.
6. با فرمان `status` شمار پیام‌های در صف و وجود خطای تحویل را بررسی کنید. فقط خروجی بدون توکن را برای عیب‌یابی بفرستید.

زبان/انتخاب‌هایی که قبلاً فقط در فایل و حافظهٔ لپ‌تاپ بودند خودکار وارد Neon نمی‌شوند؛ کاربران پس از انتقال یک بار `/start` بزنند.

## بازگشت موقت به اجرای محلی

```powershell
uv run --frozen python manage_webhook.py delete
uv run --frozen python main.py
```

حذف Webhook پیام‌های در صف را پاک نمی‌کند. قبل از فعال‌سازی مجدد Webhook، polling محلی را متوقف کنید.

## نگهداری و محدودیت‌های عملی

- فهرست و دسته‌بندی‌ها در هر اجرای گرم تا ۳۰ ثانیه کش می‌شوند؛ جست‌وجو و جزئیات قیمت/موجودی تازه دریافت می‌شوند.
- منوی محصولات قبل از عکس ارسال می‌شود و `file_id` عکس‌ها در Neon ذخیره می‌شود. در Vercel فایل‌های بزرگ عکس بسته‌بندی نمی‌شوند؛ اولین ارسال از URL عمومی تصویر روی فرانت‌اند انجام می‌شود.
- وضعیت کاربر، جست‌وجو و مقایسه برای اجراهای تازه بازیابی می‌شوند. منوهای رهاشده بعد از ۲۴ ساعت منقضی می‌شوند و زبان حفظ می‌شود.
- درخواست تکراریِ موفق دوباره پردازش نمی‌شود. اگر ارسال بخشی از پاسخ موفق شده ولی تراکنش بعداً شکست بخورد، در تلاش مجدد ممکن است بخشی از پیام‌ها دوباره ارسال شود؛ تحویل دقیقاً یک‌بار تضمین نمی‌شود.
- همهٔ کار درخواست قبل از پاسخ 200 به Telegram انجام می‌شود؛ کار پس‌زمینهٔ رهاشده‌ای وجود ندارد که با پایان اجرای serverless گم شود.
- برای کنترل حجم فضای رایگان، هفته‌ای یک بار با URL محدود بات در `.env` اجرا کنید:

```powershell
uv run --frozen python maintenance.py
```

این فرمان رسیدهای قدیمی‌تر از ۷ روز و منوهای رهاشده را جمع می‌کند و زبان را نگه می‌دارد. این کار زمان‌بندی خودکار نشده است.
