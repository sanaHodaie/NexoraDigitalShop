# اجرای Nexora روی ویندوز، بدون Docker

پروژه به Python 3.13، Node.js 22 و PostgreSQL 17 نیاز دارد. از جدول دانلود EDB،
آخرین نسخهٔ پایدار **17.x / Windows x86-64** را بگیرید؛ از نسخه‌های معرفی‌شدهٔ شما،
17.11 با نسخهٔ اصلی دیتابیس Compose و CI یکسان است.
[نصب‌کنندهٔ رسمی ویندوز](https://www.postgresql.org/download/windows/).

در نصب، Server، pgAdmin 4 و Command Line Tools را انتخاب کنید. Stack Builder
برای این پروژه لازم نیست. پورت پیش‌فرض 5432 و رمز مدیریتی `postgres` را نگه دارید.
pgAdmin ابزار مدیریت است؛ اجرای پروژه به باز بودن پنجرهٔ آن وابسته نیست.

## ساخت دیتابیس و کاربران، یک بار

در PowerShell از ریشهٔ پروژه، برای یک دیتابیس **جدید**:

```powershell
cd D:\nexoraShop
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h localhost -U postgres -c 'CREATE DATABASE nexora;'
& 'C:\Program Files\PostgreSQL\17\bin\psql.exe' -h localhost -U postgres -d nexora -f backend/scripts/provision.sql
```

اسکریپت برای `nexora_migrator` و `nexora_app` دو رمز جداگانه می‌پرسد؛ این رمزها را
به خاطر بسپارید. اگر دیتابیس/role از قبل وجود دارد، دوباره CREATE اجرا نکنید.
این اسکریپت جدول‌های فروشگاه را دستی ایجاد نمی‌کند؛ جدول‌ها فقط با Alembic ساخته می‌شوند.
کاربر `postgres` برای مدیریت است؛ API با آن وصل نمی‌شود.

## تنظیم و اجرای بک‌اند

```powershell
cd D:\nexoraShop\backend
Copy-Item .env.example .env
uv sync --frozen
```

فقط اگر `.env` ندارید آن را کپی کنید. داخل فایل، `REPLACE_APP_PASSWORD` و
`REPLACE_MIGRATION_PASSWORD` را با رمزهای همان دو کاربر جایگزین کنید.
کاراکترهای ویژهٔ رمز در URL باید percent-encode شوند؛ برای نمونه `@` برابر `%40` است.
این فایل در Git نخواهد رفت و نباید اطلاعات آن را در چت یا کد فرانت‌اند بگذارید.

برای اجرای محلی بدون سرویس ایمیل، در همین فایل تنظیم کنید:

```ini
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000
REDIS_URL=
REQUIRE_VERIFIED_EMAIL=false
```

این استثنا فقط برای دمو روی کامپیوتر است. محدودساز حافظه‌ای فقط در development/test
فعال می‌شود؛ Production بدون Redis شروع نمی‌شود. برای آزمون واقعی تأیید ایمیل،
`RESEND_API_KEY` و فرستندهٔ تأییدشدهٔ `MAIL_FROM` را تنظیم و گزینهٔ تأیید را `true` کنید.

```powershell
uv run python start.py
```

این دستور migration و seed را اجرا می‌کند، دسترسی کاربر برنامه را محدود می‌کند،
سپس دو پردازش API و worker ایمیل/انقضای سفارش را بالا می‌آورد. ترمینال را باز نگه دارید.
`http://localhost:8000/health` باید JSON با `status: ok` برگرداند.

اگر محیط مجازی قبلی ناقص است، بدون حذف آن یک محیط تازه انتخاب کنید:

```powershell
$env:UV_PROJECT_ENVIRONMENT = '.venv-local'
uv sync --frozen
uv run python start.py
```

## اجرای فرانت‌اند در ترمینال دوم

```powershell
cd D:\nexoraShop
npm ci
npm run dev
```

سایت: **http://localhost:3000**. Vite درخواست‌های `/api` را به پورت 8000 می‌فرستد.
اطلاعات این محیط در PostgreSQL کامپیوتر شماست و به Neon متصل نیست.
برای پایان، در هر دو ترمینال `Ctrl+C` بزنید؛ دیتابیس پاک نمی‌شود.

## تست‌ها

```powershell
cd D:\nexoraShop\backend
uv run pytest -q
uv run ruff check app tests alembic scripts start.py
```

این حالت برای تست معمول از SQLite موقت استفاده می‌کند، نه دیتابیس برنامه.
برای تست قفل‌ها و رقابت موجودی، یک دیتابیس جدا مثل `nexora_test` بسازید و
`TEST_DATABASE_URL` را به آن بدهید. حساب تست باید اجازهٔ ساخت schema داشته باشد؛
کاربر محدود API برای این کار مناسب نیست. هر تست schema تصادفی خودش را می‌سازد و
پاک می‌کند. **هیچ‌وقت URL سایت واقعی را به تست‌ها ندهید.**
`TEST_REDIS_URL` هم برای تست Redis واقعی است؛ نبود این دو سرویس باعث skip شدن
تست‌های وابسته می‌شود. CI برای هر دو سرویس پیکربندی شده است.

## اگر از Compose قبلی دیتابیس دارید

ابتدا سرویس db را روشن کنید و یک بار نقش‌های محلی را به‌روز کنید؛ این کار داده‌ها
را نگه می‌دارد:

```powershell
docker compose up -d db
Get-Content backend/scripts/init-local.sql | docker compose exec -T db psql -U nexora -d nexora
docker compose up -d --build
```

رمزهای ثابت داخل `init-local.sql` فقط برای دمو هستند؛ برای هاست از آن استفاده نکنید.
