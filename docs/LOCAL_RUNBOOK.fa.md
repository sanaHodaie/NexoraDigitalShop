# دفترچهٔ اجرای نکسورا در ویندوز — بدون Docker

[README فارسی](../README.fa.md) · [English README](../README.md)

این راهنما را برای دفعات بعد نگه دارید. مثال‌ها برای PowerShell در VS Code و مسیر `D:\nexoraShop` هستند؛ اگر پروژه جای دیگری است، همان مسیر واقعی را جایگزین کنید. فقط متن داخل بلوک دستور را کپی کنید؛ عبارت `PS D:\...>` و خروجی دستور را دوباره وارد نکنید.

## ۱. نقشهٔ اجرا و آدرس‌ها

| جزء | پوشه | اجرا | نشانی |
| --- | --- | --- | --- |
| دیتابیس | سرویس نصب‌شدهٔ PostgreSQL | سرویس ویندوز | معمولاً `localhost:5432` |
| بک‌اند و worker | `backend` | `uv run --frozen python start.py` | `http://127.0.0.1:8000` |
| فروشگاه و ادمین | ریشهٔ پروژه | `npm run dev` | `http://localhost:3000` و `/admin` |
| بات | `telegram_bot` با زیرخط | `uv run --frozen python main.py` | چت `@NexoraShopHelperBot` |

پنل ادمین اجرای جدا ندارد؛ Expo، پورت 8081 و `EXPO_PUBLIC_API_URL` دیگر لازم نیستند. ترتیب معمول: PostgreSQL → بک‌اند → فرانت → بات. برای فرانت، بک‌اند و بات سه ترمینال مستقل باز نگه دارید.

لوکال و آنلاین دو محیط متفاوت‌اند. حساب‌ها و درخواست‌ها در دیتابیسی ذخیره می‌شوند که بک‌اند واقعاً به آن متصل است. روشن‌بودن بک‌اند لوکال به معنی روشن‌شدن یا تغییر بک‌اند Render نیست.

## ۲. پیش‌نیازها؛ فقط نصب نخست

- Git و VS Code با PowerShell.
- Node.js نسخهٔ 22.12 یا جدیدتر سازگار با Vite.
- Python 3.13 و ابزار `uv`.
- PostgreSQL 17 به‌همراه Command Line Tools؛ pgAdmin اختیاری است.
- مسیر قابل‌دسترسی به Telegram API؛ در صورت نیاز Hiddify یا پراکسی خودتان.

بررسی ابزارها:

```powershell
git --version
node --version
npm --version
uv --version
```

نصب رسمی ابزارها: [Node](https://nodejs.org/)، [uv](https://docs.astral.sh/uv/getting-started/installation/)، [PostgreSQL ویندوز](https://www.postgresql.org/download/windows/).

برای دریافت نخست، فقط در صورتی که پوشهٔ پروژه را ندارید:

```powershell
cd D:\
git clone https://github.com/sanaHodaie/NexoraDigitalShop.git nexoraShop
cd D:\nexoraShop
```

اگر پروژه را دارید clone لازم نیست. برای به‌روزرسانی:

```powershell
cd D:\nexoraShop
git status
git pull --ff-only origin main
```

اگر Git به‌دلیل تغییر محلی یا اختلاف تاریخچه متوقف شد، تغییرات را حذف نکنید و `reset --hard` نزنید. ابتدا آن‌ها را در commit نگه دارید یا یک clone مستقل در پوشه‌ای دیگر بسازید. هنگام کپی به نسخهٔ مستقل، فقط envهای لازم را خصوصی منتقل کنید؛ `.venv` و `node_modules` را کپی نکنید.

## ۳. دیتابیس محلی؛ فقط بار اول

اگر PostgreSQL و دیتابیس پروژه قبلاً آماده‌اند، از این بخش عبور کنید. روشن‌بودن سرویس کافی است؛ بازبودن پنجرهٔ pgAdmin لازم نیست:

```powershell
Get-Service *postgres*
```

نام و نسخهٔ مسیر `psql.exe` را با نصب خود تطبیق دهید. برای یک دیتابیس **جدید**:

```powershell
cd D:\nexoraShop
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h localhost -U postgres -c 'CREATE DATABASE nexora;'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h localhost -U postgres -d nexora -f backend/scripts/provision.sql
```

رمز درخواستی نخست، رمز مدیریتی PostgreSQL خودتان است. اسکریپت برای دو نقش `nexora_migrator` و `nexora_app` رمزهای جدا می‌گیرد. نقش اول مالک migration و دومی محدود و مخصوص API است. اگر دیتابیس/نقش‌ها وجود دارند، فرمان CREATE را دوباره اجرا نکنید. جدول‌ها با Alembic ساخته می‌شوند؛ لازم نیست دستی بسازید یا دیتابیس قبلی را پاک کنید.

## ۴. تنظیم بک‌اند؛ فقط نخست یا هنگام تغییر تنظیمات

```powershell
cd D:\nexoraShop\backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

شرط بالا env موجود را بازنویسی نمی‌کند. تنظیمات پایه:

```dotenv
ENVIRONMENT=development
DATABASE_URL=postgresql+psycopg://nexora_app:REPLACE_APP_PASSWORD@localhost:5432/nexora
MIGRATION_DATABASE_URL=postgresql+psycopg://nexora_migrator:REPLACE_MIGRATION_PASSWORD@localhost:5432/nexora
SECRET_KEY=REPLACE_WITH_YOUR_PRIVATE_RANDOM_SECRET
FRONTEND_URL=http://localhost:3000
MIGRATE_ON_START=true
RUN_WORKER=true
REDIS_URL=
REQUIRE_VERIFIED_EMAIL=false
TELEGRAM_BOT_USERNAME=NexoraShopHelperBot
TELEGRAM_BOT_API_KEY=REPLACE_WITH_SHARED_SERVICE_KEY
TELEGRAM_BOT_TOKEN=REPLACE_WITH_BOTFATHER_TOKEN
```

این‌ها نمونه‌اند؛ `REPLACE_...` را عیناً استفاده نکنید. رمزهای دو URL همان رمز نقش‌های دیتابیس‌اند و با رمز حساب ادمین سایت فرق دارند. رمز URL دارای کاراکتر خاص باید URL-encode شود؛ مثلاً `@` به `%40` تبدیل می‌شود. اگر Neon را عمداً انتخاب کنید، اطلاعات این اجرا دیگر صرفاً دیتابیس لوکال نیست.

برای ساخت secret خصوصی از محیط Python پروژه استفاده کنید:

```powershell
$env:UV_PROJECT_ENVIRONMENT = ".venv-admin"
uv sync --frozen
uv run --frozen python -c "import secrets; print(secrets.token_urlsafe(48))"
```

خروجی را فقط در محل لازم قرار دهید؛ در چت/گیت/اسکرین‌شات عمومی نفرستید. برای `SECRET_KEY` و کلید مشترک تلگرام دو مقدار مستقل بسازید. `SECRET_KEY` را هر بار اجرا عوض نکنید؛ دادهٔ صف ایمیل به آن وابسته است.

`REQUIRE_VERIFIED_EMAIL=false` صرفاً برای development بدون سرویس ایمیل است؛ این تنظیم را راه‌حل ورود/خرید Production ندانید. برای تست واقعی ایمیل، `RESEND_API_KEY`، `MAIL_FROM` تأییدشده و `FRONTEND_URL` درست را تنظیم کنید. Production به Redis نیاز دارد؛ development می‌تواند محدودساز حافظه‌ای داشته باشد.

متغیرهای `$env:...` که در ترمینال تنظیم شده‌اند ممکن است مقدار فایل env را override کنند. پس از تغییر تنظیمات، بک‌اند را متوقف و مجدداً اجرا کنید.

## ۵. اجرای بک‌اند — ترمینال اول

```powershell
cd D:\nexoraShop\backend
$env:UV_PROJECT_ENVIRONMENT = ".venv-admin"
uv sync --frozen
uv run --frozen python start.py
```

`uv sync` بار اول و پس از تغییر وابستگی‌ها لازم است؛ اجرای روزمره با همان محیط آماده می‌تواند مستقیماً `start.py` باشد. فعال‌کردن دستی محیط مجازی و تغییر ExecutionPolicy لازم نیست.

خروجی موفق شامل `Application startup complete` و `Uvicorn running on http://0.0.0.0:8000` است. برای مرورگر از `127.0.0.1` استفاده کنید، نه `0.0.0.0`.

در ترمینال دیگر بررسی کنید:

```powershell
curl.exe --noproxy "*" --max-time 10 http://127.0.0.1:8000/health
```

انتظار: `{"status":"ok"}`. `start.py` با `MIGRATE_ON_START=true`، migration، seed و grants را اعمال و API/worker را اجرا می‌کند. Seed تغییرات قیمت/موجودی مدیر را بازنشانی نمی‌کند؛ فقط عکس‌های پیش‌فرض قدیمی مشخص‌شده را اصلاح می‌کند. اگر این تنظیم false است، اجرای migration/seed/grants وظیفهٔ جداگانهٔ اپراتور است.

ترمینال باید باز بماند. کار ظاهراً متوقف روی خط `Uvicorn running` طبیعی است؛ سرور منتظر درخواست است.

## ۶. اجرای فرانت و پنل — ترمینال دوم

```powershell
cd D:\nexoraShop
npm ci --no-audit --no-fund
npm run dev
```

`npm ci` برای نصب نخست یا بعد از تغییر lockfile است؛ روزمره `npm run dev` کافی است. ترمینال را باز نگه دارید.

- فروشگاه: http://localhost:3000
- ادمین: http://localhost:3000/admin
- پشتیبانی: http://localhost:3000/support

Vite مسیر `/api` را به `http://127.0.0.1:8000` می‌فرستد؛ برای اجرای استاندارد env فرانت لازم نیست. کلید بات، URL دیتابیس و secret را به `VITE_*` اضافه نکنید. پورت 3000 را آزاد نگه دارید؛ اگر Vite پورت دیگری انتخاب کرد، ابتدا پردازش قبلی را بررسی کنید یا تنظیمات مبدأ را آگاهانه هماهنگ کنید.

اگر پراکسی ویندوز، localhost را هم عبور می‌دهد، در ترمینال‌های مربوط به اجرا می‌توانید تنظیم کنید:

```powershell
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
```

این مقدار فقط برای همان ترمینال است. وقتی API روی localhost است، ترافیک آن نباید به پراکسی خارجی فرستاده شود.

## ۷. ساخت یا تنظیم مدیر لوکال

اول اجازه دهید migration بک‌اند تمام شود. سپس در ترمینال آزاد:

```powershell
cd D:\nexoraShop\backend
$env:UV_PROJECT_ENVIRONMENT = ".venv-admin"
uv run --frozen python -m app.setup_local_admin adminpannel@nexora.com
```

رمز ۱۲ تا ۱۲۸ کاراکتری را دو بار وارد کنید؛ موقع تایپ هیچ حرف یا ستاره‌ای دیده نمی‌شود و طبیعی است. پس از پیام `Local admin ready. Online accounts were not changed.` با همان ایمیل و **همان رمزی که خودتان وارد کردید** در `/admin` وارد شوید.

این ابزار حساب لوکال را ایجاد/بازتنظیم و نشست‌های قبلی آن را باطل می‌کند؛ لازم نیست هر بار اجرا شود. فقط `ENVIRONMENT=development` و URL دیتابیس localhost را می‌پذیرد؛ برای Neon یا سایت آنلاین نیست. رمز پیش‌فرضی در پروژه وجود ندارد.

## ۸. تنظیم بات — فقط نصب نخست یا تغییر اتصال

از پوشهٔ درست با **زیرخط** استفاده کنید؛ `telegram-bot` مسیر این مخزن نیست:

```powershell
cd D:\nexoraShop\telegram_bot
uv sync --frozen
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

تنظیم محلی:

```dotenv
BOT_TOKEN=REPLACE_WITH_BOTFATHER_TOKEN
NEXORA_API_URL=http://127.0.0.1:8000
PRODUCTS_PATH=/api/products
PRODUCT_DETAIL_PATH=/api/products/{id}
FRONTEND_URL=http://localhost:3000
TELEGRAM_BOT_API_KEY=REPLACE_WITH_SHARED_SERVICE_KEY
PROXY_URL=http://127.0.0.1:12334
PRICE_SUFFIX=" ریال"
PAGE_SIZE=5
DATA_DIR=./data
```

`PROXY_URL` مثال پورت Mixed هیدفای شماست؛ اگر پورت تغییر کرده، مقدار واقعی را بگذارید. در شبکهٔ دارای دسترسی مستقیم می‌توانید آن را خالی کنید. خود Hiddify باید روشن و متصل باشد؛ صرف نوشتن آدرس پراکسی اتصال ایجاد نمی‌کند.

| مقدار | محل | رابطه |
| --- | --- | --- |
| `BOT_TOKEN` | `telegram_bot/.env` | توکن واقعی BotFather |
| `TELEGRAM_BOT_TOKEN` | `backend/.env` | همان توکن؛ برای ارسال PDF توسط worker |
| `TELEGRAM_BOT_API_KEY` | هر دو فایل بالا | یک کلید مشترک مستقل، یکسان و حداقل ۳۲ کاراکتر |
| `NEXORA_API_URL` | env بات | بک‌اند مستقیم؛ اینجا `http://127.0.0.1:8000` |
| `FRONTEND_URL` | هر دو فایل | نشانی فرانت این محیط؛ اینجا `http://localhost:3000` |

مقدار همیشه **بعد از مساوی** قرار می‌گیرد؛ `BOT_TOKEN="YOUR_PRIVATE_VALUE"` قالب معتبری است. خود توکن را در دستور ترمینال، نام فایل یا قبل از متغیر نگذارید.

اگر بات به Render وصل شود ولی پنل از API لوکال بخواند، درخواست‌ها در همان پنل لوکال دیده نمی‌شوند. برای تست این راهنما، بات و پنل هر دو باید به همان بک‌اند محلی وصل باشند. مسیرهای `/internal/telegram/*` از پروکسی معمول `/api` فرانت عبور نمی‌کنند.

## ۹. تست و اجرای بات — ترمینال سوم

```powershell
cd D:\nexoraShop\telegram_bot
uv run --frozen python preflight.py --customer-service
uv run --frozen python preflight.py --telegram
```

خروجی موفق اول:

```text
Customer service authentication, schema and read/insert access: OK
Automatic invoice delivery configured: True
```

`True` فقط وجود تنظیم توکن ارسال در بک‌اند را گزارش می‌کند؛ رسیدن واقعی فایل به مشتری را اثبات نمی‌کند. `False` یعنی ثبت/پیگیری ممکن است کار کند، اما ارسال خودکار فاکتور آماده نیست.

خروجی موفق دوم شامل موارد زیر است:

```text
Telegram getMe OK: @NexoraShopHelperBot
No webhook configured; polling can start
```

سپس:

```powershell
uv run --frozen python main.py
```

در چت خصوصی https://t.me/NexoraShopHelperBot دستور `/start` را بفرستید، «شروع» را بزنید و منوی خدمات را بررسی کنید. `/ping` اتصال بک‌اند را آزمایش می‌کند.

برای هر توکن فقط یک polling روشن باشد. قبل از این کار، اجرای لپ‌تاپ دوستتان یا سرویس polling دیگر را متوقف کنید. اگر webhook فعال است، آن را بدون برنامهٔ انتقال حذف نکنید؛ [راهنمای webhook](../telegram_bot/DEPLOYMENT.fa.md) را دنبال کنید. تغییر بات زندهٔ مشترک می‌تواند کاربران دیگر را تحت تأثیر قرار دهد.

بستن ترمینال، خواب یا خاموشی کامپیوتر بات را متوقف می‌کند. تلگرام کد بات شما را میزبانی نمی‌کند. اجرای همیشگی به میزبان مستقل polling یا webhook نیاز دارد.

## ۱۰. تست کامل درخواست عمده و فاکتور

1. بات، بک‌اند، فرانت و PostgreSQL روشن باشند. در پنل لوکال با مدیر وارد شوید.
2. در بات «درخواست خرید عمده» را بزنید؛ از اطلاعات آزمایشی غیرحساس استفاده و نام، تماس، کالا/تعداد، شهر و نشانی را کامل کنید.
3. خلاصه را بررسی و «تأیید و ارسال» را بزنید. شمارهٔ درخواست باید پس از پاسخ سرور بیاید.
4. در http://localhost:3000/admin#customer-requests تازه‌سازی کنید. فیلتر نوع/وضعیت را روی «همه» بگذارید و مشتری، اقلام و نشانی را تطبیق دهید.
5. جزئیات را باز، اقلام و قیمت توافقی را بازبینی و فقط درخواست آزمایشی را تأیید کنید؛ این مرحله واقعاً PDF تولید و ارسال تلگرام را صف‌بندی می‌کند.
6. کد رهگیری هشت‌رقمی و PDF پنل را بررسی کنید. عمدهٔ تأییدشده باید در «سفارشات و فاکتورها» با منبع تلگرام دیده شود؛ این به معنی پرداخت یا رزرو موجودی سایت نیست.
7. دریافت پیام/PDF در همان حساب تلگرام ثبت‌کننده را بررسی کنید؛ فایل ادمین و مشتری باید همان سند باشد. وضعیت صف/ارسال/خطا در پنل مستقل نمایش داده می‌شود.
8. در بات «پیگیری درخواست‌ها» و دریافت دوبارهٔ فاکتور را بررسی کنید. یادداشت داخلی ادمین نباید برای مشتری ظاهر شود.

برای ارسال PDF محلی، **worker بک‌اند** هم باید به Telegram API دسترسی داشته باشد. `PROXY_URL` در env بات، پراکسی worker را تنظیم نمی‌کند. در صورت نیاز، قبل از اجرای بک‌اند در ترمینال اول:

```powershell
$env:HTTPS_PROXY = 'http://127.0.0.1:12334'
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
uv run --frozen python start.py
```

پورت را با Mixed/HTTP واقعی Hiddify تطبیق دهید. این پراکسی می‌تواند سایر درخواست‌های HTTP بک‌اند را هم تحت تأثیر قرار دهد؛ روی Render آدرس پراکسی لپ‌تاپ را نگذارید. برای بازگشت به مسیر مستقیم در همان ترمینال:

```powershell
Remove-Item Env:HTTPS_PROXY -ErrorAction SilentlyContinue
```

بعد بک‌اند را مجدداً اجرا کنید. وضعیت `configured=True`، کد رهگیری یا دانلود موفق پنل جای تست تحویل زنده را نمی‌گیرد.

## ۱۱. کارت اجرای روزمره

اگر نصب و تنظیمات قبلاً درست شده‌اند، فقط این سه بلوک را در سه ترمینال جدا اجرا کنید:

**بک‌اند:**

```powershell
cd D:\nexoraShop\backend
$env:UV_PROJECT_ENVIRONMENT = '.venv-admin'
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
uv run --frozen python start.py
```

**فرانت و پنل:**

```powershell
cd D:\nexoraShop
npm run dev
```

**بات، بعد از آماده‌شدن بک‌اند و اتصال Hiddify در صورت نیاز:**

```powershell
cd D:\nexoraShop\telegram_bot
uv run --frozen python preflight.py --customer-service
uv run --frozen python preflight.py --telegram
uv run --frozen python main.py
```

اگر preflight خطا داد، پیش از اجرای `main.py` علت را رفع کنید. برای ارسال فاکتور از worker در شبکهٔ فیلترشده، تنظیم پراکسی بخش ۱۰ را هم در ترمینال بک‌اند اعمال کنید.

## ۱۲. توقف، به‌روزرسانی و نسخهٔ پشتیبان

- توقف: در ترمینال بات، فرانت و بک‌اند `Ctrl+C` بزنید. PostgreSQL و داده‌ها پاک نمی‌شوند.
- به‌روزرسانی: برنامه‌ها را متوقف کنید، در ریشه `git pull --ff-only origin main` بزنید؛ اگر lockfile تغییر کرده، `npm ci` در ریشه و `uv sync --frozen` در هر پوشهٔ Python مربوط اجرا کنید؛ سپس با همان env انتخاب‌شده دوباره بالا بیاورید.
- `.env` موجود را از نمونه دوباره کپی نکنید. env و مقادیر `$env:` دو محل متفاوت‌اند؛ متغیر شل پس از بستن پنجره معمولاً باقی نمی‌ماند.
- پیش از migration مهم از دیتابیس بکاپ بگیرید. بکاپ باید شامل داده و تصاویر ذخیره‌شده باشد؛ ذخیره‌کردن فقط کد یا عکس پوشهٔ public، بکاپ سفارش‌ها نیست.
- `git reset --hard`، حذف دیتابیس و downgrade راه‌حل معمول خطای اجرا نیستند.

## ۱۳. جدول عیب‌یابی

| نشانه | بررسی و اقدام |
| --- | --- |
| `No pyproject.toml found` | پوشه اشتباه است؛ بک‌اند در `backend` و بات در `telegram_bot` اجرا می‌شود. `Test-Path .\pyproject.toml` باید True باشد. |
| `failed to locate pyvenv.cfg` | محیط قبلی خراب/کپی‌شده است؛ با `UV_PROJECT_ENVIRONMENT` یک محیط تازه انتخاب و sync کنید، لازم نیست پوشهٔ قفل‌شده را rename/delete کنید. |
| `Rename-Item ... Access denied` | از نام محیط تازه استفاده کنید؛ پردازش‌های فعال محیط قبلی را نیز شناسایی کنید. |
| سلامت API پاسخ نمی‌دهد | ترمینال بک‌اند، سرویس PostgreSQL، نقش/رمز، پورت 8000 و خروجی migration را بررسی کنید. |
| API سلامت دارد ولی فرانت خطای شبکه می‌دهد | پروکسی Vite، پورت واقعی فرانت، مبدأ کوکی و NO_PROXY را بررسی کنید؛ همیشه یک آدرس ثابت localhost برای فرانت استفاده کنید. |
| `ApiNetworkError` بات | آدرس `NEXORA_API_URL`، دسترسی بک‌اند، DNS و پراکسی را بررسی کنید. سلامت با `curl --noproxy` را جدا بسنجید. |
| `Backend rejected the shared service key` | مقدار مشترک باید در env همان بک‌اند مقصد و بات یکسان باشد؛ متغیر شل قدیمی را بررسی و بک‌اند/بات را restart کنید. |
| `routes are not deployed` / `Not Found` | بک‌اند مقصد قدیمی/اشتباه است؛ هم فرانت و هم API باید نسخهٔ متناسب را داشته باشند. |
| درخواست ثبت شد ولی پنل خالی است | مقصد بات، مقصد API پنل، دیتابیس و فیلترها را تطبیق دهید؛ صرف localhost بودن صفحه ثابت نمی‌کند بک‌اند آن چیست. |
| `TelegramNetworkError` | Hiddify، پورت Mixed، env بات و دسترسی Telegram را بررسی کنید؛ سلامت API فروشگاه، دسترسی تلگرام را اثبات نمی‌کند. |
| `Automatic invoice delivery configured: False` | `TELEGRAM_BOT_TOKEN` در env بک‌اند مقصد تنظیم نیست؛ توکن صحیح را خصوصی وارد و بک‌اند را restart کنید. |
| PDF پنل هست ولی به تلگرام نمی‌رسد | worker، `RUN_WORKER`، دسترسی Telegram از خود بک‌اند، وضعیت تحویل و امکان مسدودشدن بات توسط مشتری را بررسی کنید. |
| `Conflict` در polling | نسخهٔ دیگر polling یا webhook همان توکن فعال است؛ یک مسیر اجرا انتخاب کنید. |
| `401 INVALID_CREDENTIALS` | ایمیل/رمز مربوط به دیتابیس همان محیط است؛ مدیر بودن و درست‌بودن رمز دو موضوع جدا هستند. |
| `403` بعد از ورود موفق | مجوز مدیریت/عملیات را بررسی کنید؛ ثبت‌نام عادی مجوز ادمین نمی‌دهد. |
| `INVALID_CSRF` | از صفحهٔ اصلی مبدأ درست وارد شوید؛ کلاینت باید ابتدا CSRF بگیرد و کوکی+هدر را در همان نشست بفرستد. آزمون POST خام لاگین کافی نیست. |
| عکس قدیمی | آخرین فرانت را دریافت/دیپلوی و `Ctrl+Shift+R` کنید؛ مسیرهای قدیمی مشخص‌شده اکنون در فرانت هم اصلاح می‌شوند. |
| تأخیر اولین پاسخ آنلاین | خواب Render/Neon، شبکه و زمان پاسخ API را جدا اندازه بگیرید؛ افزایش سرعت UI سرویس خوابیده را بیدار نگه نمی‌دارد. |

محیط تازه بدون دست‌زدن به محیط قدیمی:

```powershell
cd D:\nexoraShop\backend
$env:UV_PROJECT_ENVIRONMENT = '.venv-local-fresh'
uv sync --frozen
uv run --frozen python start.py
```

از این پس در همان ترمینال از همین نام استفاده کنید. در ترمینال تازه دوباره آن را تنظیم کنید.

بررسی پراکسی تلگرام بدون توکن:

```powershell
curl.exe --proxy http://127.0.0.1:12334 --connect-timeout 10 --max-time 20 https://api.telegram.org
```

پاسخ HTTP مانند 302 نشان‌دهندهٔ رسیدن به سایت است، نه اعتبار توکن؛ `preflight.py --telegram` آزمون `getMe` را انجام می‌دهد. فایل env یا URL دارای توکن را برای گزارش نفرستید.

<a id="online-admin"></a>
## ۱۴. ورود ادمین روی Vercel؛ بعد از اجرای محلی

صفحهٔ آنلاین: https://nexora-digital-shop.vercel.app/admin

1. در Vercel تأیید کنید دیپلوی Production آخرین commit آماده است. Root Directory ریشهٔ مخزن، build برابر `npm run build:vercel` و خروجی `dist` باشد.
2. در Render سرویس بک‌اند باید Live و نسخهٔ متناسب/مهاجرت‌ها آماده باشد. مقصد rewrite در `vercel.json` اکنون `https://nexora-api-s2q3.onrender.com` است.
3. صفحهٔ ادمین آنلاین را باز و «بررسی اتصال» را بزنید؛ سپس با ایمیل/رمز حساب مدیر **دیتابیس آنلاین** وارد شوید. رمز لوکال لزوماً آنجا وجود ندارد.
4. برای بررسی عمومی بدون رمز، در PowerShell:

```powershell
curl.exe --connect-timeout 15 --max-time 90 https://nexora-api-s2q3.onrender.com/health
curl.exe --connect-timeout 15 --max-time 90 https://nexora-digital-shop.vercel.app/api/csrf
curl.exe -i --connect-timeout 15 --max-time 90 https://nexora-digital-shop.vercel.app/api/auth/me
```

`/health` باید JSON سلامت و `/api/csrf` پاسخ JSON توکن بدهد. `401` برای `/api/auth/me` در curl بدون نشست طبیعی است. توکن CSRF خروجی را لازم نیست ارسال کنید. اگر به پراکسی نیاز دارید، `--proxy http://127.0.0.1:12334` را به همان فرمان اضافه کنید.

5. اگر لاگین خطا داشت، در DevTools → Network درخواست `/api/auth/login` را باز کنید. برای گزارش فقط URL عمومی، Status و متن `error/code` لازم است؛ Request Payload، رمز، کوکی، CSRF، Authorization یا فایل env را نفرستید.
6. `401 INVALID_CREDENTIALS` معمولاً بررسی حساب/رمز **همان دیتابیس آنلاین** را می‌خواهد؛ `400 INVALID_CSRF` مشکل نشست/CSRF است؛ `403` پس از ورود موفق می‌تواند مجوز ادمین باشد. `502/503` یا صفحهٔ HTML جای JSON ابتدا بررسی API/دیپلوی را می‌خواهد.

### تشخیص تکرار خطای رمز، بدون بازتنظیم دوباره

```powershell
cd D:\nexoraShop\backend
$env:UV_PROJECT_ENVIRONMENT = '.venv-admin'
uv run --frozen python -m app.diagnose_admin adminpannel@nexora.com --online
```

ابزار ابتدا URL مهاجرت واقعی Render و سپس رمز فعلی حساب را مخفی می‌گیرد؛ از env قدیمی برای انتخاب دیتابیس استفاده نمی‌کند. رمز را فقط در حافظه با هش دیتابیس بررسی می‌کند و تغییر نمی‌دهد. در حالت `--online` پس از تطابق رمز، یک تلاش ورود با CSRF/کوکی صحیح به هر یک از دو دامنهٔ ثابت پروژه انجام و در صورت موفقیت خروج می‌کند؛ ممکن است رویداد ورود/خروج و محدودیت نرخ ایجاد شود. پشت سر هم تکرار نکنید.

`DATABASE_PASSWORD_OK` فقط تطابق رمز دیتابیس انتخاب‌شده است. اگر پس از آن Render خطای `INVALID_CREDENTIALS` بدهد، مقصد دیتابیس/سرویس در حال اجرا باید بررسی شود. موفقیت Render و شکست Vercel نیازمند بررسی rewrite/کوکی/دیپلوی است. `LOGIN_OK ADMIN_HTTP_403` یعنی احراز هویت موفق است ولی مجوز مدیریت کافی نیست. خطای شبکه یا CSRF، غلط‌بودن رمز را ثابت نمی‌کند. رمز، URL کامل، هش و کوکی چاپ نمی‌شوند؛ فقط خروجی تشخیصی را ارسال کنید.

### تنظیم مدیر آنلاین، فقط توسط اپراتور مجاز

حساب باید ابتدا در سایت آنلاین ثبت شده باشد. ابزار `setup_local_admin` برای Neon قابل استفاده نیست. ابزار موجود برای حساب از قبل ثبت‌شده:

```powershell
cd D:\nexoraShop\backend
$env:UV_PROJECT_ENVIRONMENT = '.venv-admin'
uv run --frozen python -m app.provision_admin adminpannel@nexora.com
```

این دستور فقط وقتی محیط اپراتور عمداً با `MIGRATION_DATABASE_URL` **همان دیتابیس آنلاین مورد استفادهٔ Render** تنظیم شده باشد روی حساب آنلاین اثر دارد. با URL لوکال، فقط نقش لوکال تغییر می‌کند. فرمان بدون گزینهٔ رمز فقط مجوزها را تغییر می‌دهد.

اگر بازتنظیم رمز حساب آنلاین واقعاً لازم و مجاز است، ابزار گزینهٔ امن دارد:

```powershell
uv run --frozen python -m app.provision_admin adminpannel@nexora.com --set-password
```

رمز دو بار مخفی گرفته می‌شود؛ این عملیات رمز همان حساب را تغییر و نشست‌ها/لینک‌های بازیابی قبلی را باطل می‌کند. این مرحله تست بی‌اثر نیست؛ تنها پس از تأیید مقصد دیتابیس و نیاز به تغییر اجرا شود. اعتبار مهاجرت را از تنظیمات امن بگیرید، نه از URL نمونهٔ README؛ URL/رمز را در چت یا تاریخچهٔ دستور وارد نکنید. اگر موقتاً تنظیم شل را برای دیتابیس آنلاین عوض کرده‌اید، پس از پایان آن را حذف/بازگردانید و قبل از اجرای عادی لوکال، مقصد را دوباره بررسی کنید.

نشانی‌ها و دستورها ابزار تشخیص‌اند؛ تا ورود واقعی در مرورگر موفق نشده، سالم‌بودن ورود آنلاین تأیید نشده است.

## ۱۵. نگهداری و میزبانی آنلاین

- فرانت Vercel، API Render و دیتابیس Neon سه جزء جدا هستند؛ هر سه باید به تنظیمات سازگار اشاره کنند.
- `NEXORA_API_URL` متعلق به بات است؛ تعریف آن روی Render فروشگاه، پروکسی Vercel را تغییر نمی‌دهد.
- `NEXORA_API_ORIGIN` در JSON فعلی Vercel مصرف نمی‌شود؛ مقصد در rewrite نوشته شده است.
- برای اجرای دائمی بات از [راهنمای webhook](../telegram_bot/DEPLOYMENT.fa.md) استفاده کنید. روی میزبان، آدرس پراکسی localhost لپ‌تاپ نگذارید.
- Production به Redis، HTTPS، نقش محدود دیتابیس، secret پایدار و تنظیمات سرویس‌های فعال نیاز دارد. لوکال بدون Docker این الزامات آنلاین را حذف نمی‌کند.
- راهنمای امکانات: [README فارسی](../README.fa.md)، [پنل](../AdminPanel/MIGRATION.fa.md)، [بات خدمات مشتری](../telegram_bot/CUSTOMER_CARE.fa.md).
