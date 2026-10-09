# گزارش پیاده‌سازی معماری و امنیت Nexora

تاریخ گزارش: ۸ اکتبر ۲۰۲۶. تغییرات روی فایل‌های پروژه اعمال شده‌اند؛ هیچ migration
روی دیتابیس آنلاین، استقرار، ساخت سرویس خارجی یا push در این مرحله انجام نشده است.

## معماری واقعی و جهت وابستگی‌ها

بک‌اند یک **Modular Monolith** با ماژول‌های کاربردی Identity، Shopping و Ordering
است. پردازش worker متعلق به همین برنامه و همین قراردادهاست؛ microservice ساخته
نشده و SQLAlchemy همچنان synchronous است.

```text
Presentation (FastAPI + Pydantic)
             ↓
Application (Identity / Shopping / Orders / InventoryReservation)
             ↓
Domain (dataclass entities, invariants, order/session states)

Infrastructure ──implements──> Application repository/UoW ports
bootstrap.py ──wires──> Application + Infrastructure
Core: configuration and safe logging, used by outer layers
```

Domain/Application هیچ import از SQLAlchemy، FastAPI، Starlette، Infrastructure،
Presentation یا Core ندارند؛ تست AST این مرز را کنترل می‌کند. repositoryها مدل
ORM را به entity مستقل تبدیل می‌کنند. routerها ورودی Pydantic، DI، کوکی/HTTP و
serialization را مدیریت می‌کنند؛ منطق حساب، سفارش، موجودی و shipping به داخل
Application/Domain منتقل شده است. فایل‌های قدیمی مدل/config/router فقط مسیرهای
سازگاری import هستند و پیاده‌سازی موازی ندارند.

Use caseهای ورود، ثبت‌نام، خروج، تغییر رمز، درخواست و مصرف بازیابی رمز، درخواست
و مصرف تأیید ایمیل، تغییر ایمیل و پروفایل در `application/identity.py`، سبد و
wishlist در `application/shopping.py` و ساخت/لغو/انقضای سفارش و رزرو موجودی در
`application/orders.py` مستقل از router اجرا می‌شوند. عملیات مرتبط داخل سرویس
ماژول خود گروه‌بندی شده‌اند؛ به‌ازای هر endpoint یک کلاس تشریفاتی ساخته نشده است.

## کنترل‌هایی که حفظ یا تقویت شدند

| موضوع | نتیجهٔ پیاده‌سازی |
|---|---|
| رمز عبور | Argon2 موجود حفظ شد؛ تغییر رمز نیازمند رمز فعلی است؛ hash جدید، حذف لینک‌های بازیابی/تغییر ایمیل معلق، ابطال نشست‌های قبلی و ساخت نشست تازه در یک تراکنش |
| نشست | فقط hash توکن تصادفی ۲۵۶ بیتی در جدول؛ created/expires/last_used/revoked؛ idle پیش‌فرض ۳۰ دقیقه و absolute پیش‌فرض ۱۴ روز؛ خروج همین دستگاه/همهٔ دستگاه‌ها |
| CSRF | HMAC متصل به nonce مرورگر و نشست؛ روی همهٔ mutationهای `/api`؛ GET/HEAD/OPTIONS معاف‌اند و عملیات تغییردهنده ندارند |
| محدودسازی | Redis با Lua اتمیک در Production؛ کلیدهای IP/account جدا برای هر عملیات؛ HMAC شناسه‌ها؛ در خرابی Redis پاسخ 503؛ حافظه فقط development/test |
| افشای وجود حساب | پیام و وضعیت یکسان برای ورود ناموفق، ثبت‌نام تکراری و درخواست بازیابی؛ بررسی dummy hash برای ورود به حساب ناموجود؛ پردازش ایمیل در worker |
| تأیید ایمیل | hash توکن، انقضای ۳۰ دقیقه، مصرف اتمیک یک‌بار، email_verified_at؛ سفارش برای ایمیل تأییدنشده 403؛ ورود Google معتبر می‌تواند آدرس مطابق را تأیید کند |
| مالکیت اطلاعات | شناسهٔ کاربر فقط از نشست؛ profile/cart/wishlist/order scoped؛ درخواست سفارش کاربر دیگر 404 |
| مجوز مدیریت | roles، role_permissions، user_roles؛ تأیید پرداخت نیازمند permission `orders:confirm_payment`؛ نام role به‌تنهایی کافی نیست؛ اعطای خودکار مدیر نداریم |
| سفارش | قیمت فقط از DB، Decimal، lock حساب، کاهش شرطی موجودی، ثبت Order/Lines/پاک‌کردن cart/audit در یک UoW؛ rollback کامل در شکست |
| رزرو | pending/pending_payment/paid/expired/cancelled؛ مهلت پیش‌فرض ۲۰ دقیقه؛ cancel/expire با lock سفارش و آزادسازی دقیقاً یک بار؛ paid آزاد نمی‌شود |
| audit | ثبت فقط event، user_id، subject_id و زمان؛ هیچ رمز، کوکی، token یا payment secret در audit پذیرفته نمی‌شود |
| خطا و log | پاسخ استاندارد error/code؛ ورودی اعتبارسنجی و stack trace به client برنمی‌گردد؛ JSON logging با redaction؛ جزئیات استثنا و access log خام حذف شدند |
| Headers | CSP مجزای React و API، HSTS در Production، nosniff، Referrer-Policy، Permissions-Policy؛ docs توسعه استثنای جدا دارد و در Production غیرفعال است |
| CORS | بدون wildcard؛ allowlist دقیق؛ مدل اصلی مرورگر همچنان پراکسی same-origin است |
| secret | فقط env example در Git؛ secret تولید/دریافت از محیط؛ production کلید توسعه را رد می‌کند؛ credential مهاجرت از محیط فرزندان حذف می‌شود |
| دیتابیس | role برنامه از migration جدا؛ startup Production نقش مدیریتی/مالک جدول/دارای CREATE schema را رد می‌کند؛ RBAC برای برنامه read-only، audit بدون UPDATE/DELETE، محصولات فقط UPDATE stock |
| ایمیل | PostgreSQL transactional outbox، رمزنگاری payload، lease و SKIP LOCKED، retry با backoff، حداکثر شش تلاش، dead-letter و idempotency ارسال؛ BackgroundTasks حذف شد |

رویدادهای audit: `LOGIN_SUCCESS`، `LOGIN_FAILED`، `LOGOUT`، `PASSWORD_CHANGED`،
`PASSWORD_RESET`، `SESSION_REVOKED`، `EMAIL_VERIFIED`، `EMAIL_CHANGED`،
`ORDER_CREATED`، `ORDER_CANCELLED`، `ORDER_EXPIRED` و `PAYMENT_CONFIRMED`.

صف ایمیل عمداً به PostgreSQL سپرده شده، نه Redis: ثبت تغییر حساب و enqueue
در همان تراکنش انجام می‌شود و مشکل commit موفق DB/شکست publish جدا ایجاد نمی‌شود.
توکن احراز هویت فقط hash است؛ برای تحویل ایمیل، raw token موقتاً در payload
**رمزنگاری‌شده** نگه‌داری می‌شود و پس از ارسال موفق پاک می‌شود. نگه‌داری امن
SECRET_KEY و دسترسی محدود به outbox جزو الزامات عملیاتی است.

کنترل نرخ پیش‌فرض: ورود ۳۰ درخواست/IP/دقیقه و ۵ درخواست/account/دقیقه؛ عملیات
ایمیل و ثبت‌نام ۱۰/IP و ۳/account در دقیقه؛ هر عملیات bucket مستقل دارد.
شمارنده‌ها بعد از پنجره منقضی می‌شوند. Proxy header از راست به چپ با trusted
peer/CIDR بررسی می‌شود؛ تنظیم اشتباه ingress همچنان می‌تواند IP کاربران را یکی نشان دهد.

## migration دیتابیس

`alembic/versions/0003_security_reservations.py` بعد از 0002:

- `users.email_verified_at` و فیلدهای چرخهٔ عمر `auth_sessions`.
- مهلت رزرو و شناسهٔ یکتای پرداخت در `orders`.
- جدول‌های `action_tokens`، `security_audit_logs`، `email_outbox` و سه جدول RBAC.
- تعریف role مدیر و permissionها، بدون اختصاص آن به هیچ حسابی.
- ابطال نشست‌های قبل از ارتقا؛ سفارش قدیمی پرداخت‌نشده در اولین چرخهٔ worker منقضی می‌شود.
- تست تطابق metadata با schema و downgrade/upgrade روی دیتابیس آزمایشی.

دادهٔ آنلاین دست‌کاری نشده است. قبل از انتشار backup، بررسی وضعیت سفارش‌های قدیمی
و تأیید مالکیت/permissionهای DB لازم است. downgrade فیلدها و audit/outbox جدید را
حذف می‌کند؛ روش بازیابی داده backup است و downgrade جایگزین backup نیست.

## تغییرات API و فرانت‌اند

| قرارداد | تغییر |
|---|---|
| POST `/api/auth/register` | 202 با پیام عمومی، بدون ورود خودکار؛ UI به فرم ورود می‌رود |
| POST `/api/account/password` | `currentPassword` و `newPassword`؛ پاسخ 204 با کوکی تازه |
| AccountOutput | فیلد اضافهٔ `emailVerifiedAt` |
| OrderOutput | فیلد اضافهٔ `reservationExpiresAt`؛ وضعیت‌های expired/cancelled پشتیبانی می‌شوند |
| logout-all | POST `/api/auth/logout-all` |
| تأیید ایمیل | POST `/api/auth/request-verification` و `/api/auth/verify-email` |
| تغییر ایمیل | POST `/api/account/email` و `/api/auth/confirm-email-change` |
| پروفایل | GET جدید `/api/account/profile`؛ PATCH قبلی حفظ شد |
| لغو سفارش | POST `/api/account/orders/{id}/cancel` |
| تأیید مدیریت | POST `/api/management/orders/{id}/confirm-payment` با reference یکتا و permission |

مسیرهای موجود کاتالوگ، ورود، Google، پروفایل، سبد، wishlist و تاریخچه حفظ شده‌اند.
نام‌های camelCase و فیلد error حفظ شدند و code اضافه شد. reference پرداختِ این
endpoint **تأیید دستی مدیریت** است؛ درگاه واقعی یا callback مرورگر قابل اعتماد
پیاده‌سازی نشده است.

React: فیلد رمز فعلی، پیام عمومی ثبت‌نام، اعلان/ارسال مجدد تأیید ایمیل، صفحهٔ
تأیید با حذف fragment از history، خروج همهٔ دستگاه‌ها و لغو/مهلت سفارش اضافه شد.
کلاینت دیگر پیام JSON پاسخ 202 را دور نمی‌ریزد؛ پاسخ خالی خبرنامه همچنان معتبر است.
صفحهٔ جدید lazy و RTL است و مسیرهای خصوصی noindex/no-store دارند.

## آزمون‌ها و نتیجهٔ واقعی اجرا

آزمون‌های قبلی حفظ و با قراردادهای جدید به `tests/integration` و `tests/security`
منتقل شدند. تست‌های تازه شامل مرز وابستگی‌ها، پول Decimal، timeout/invalid session،
CSRF همهٔ mutationها، ورود غلط/درست، rate limit حساب، خرابی Redis، رمز فعلی غلط،
rotation و ابطال دستگاه دوم، reset منقضی/یک‌بارمصرف، تأیید ایمیل، دسترسی سفارش
دیگران، قیمت دست‌کاری‌شده، رزرو/انقضا/لغو، rollback، permission بدون اتکا به نام
role، idempotency پرداخت، تغییر ایمیل، retry/dead-letter/deduplication صف، مسیر
لینک ایمیل، CORS و redaction هستند.

آخرین نتایج ثبت‌شده:

- **pytest: ۵۲ موفق، ۲ skip**؛ skipها تست رقابت سفارش روی PostgreSQL واقعی و
  شمارندهٔ مشترک روی Redis واقعی‌اند. این سرویس‌ها در محیط فعلی فعال نیستند؛
  Docker daemon نیز در دسترس نبود. SQLite جایگزین اثبات قفل‌های PostgreSQL نیست.
- **Ruff: موفق**؛ معماری بدون import بیرونی در Domain/Application بررسی شد.
- **TypeScript (`npm run lint`) و Vite production build: موفق**.
- **Node API-client/Vercel tests: ۲۷ موفق**؛ تست 202 JSON نیز اضافه شد.
- **PyPI audit: ۴۷ بستهٔ قفل‌شده بررسی شد؛ advisory فعال گزارش نشد**. این نتیجه
  فقط snapshot feed است و تضمین نبود آسیب‌پذیری نیست.
- `npm audit` اولیه آسیب‌پذیری `source-map-js < 1.2.2` را نشان داد؛ نسخهٔ
  **1.2.2** با hash رجیستری رسمی نصب و lock به‌روز شد. اجرای مجدد آنلاین audit
  به ECONNRESET برخورد کرد؛ خروجی «صفر» install آفلاین، گواه audit آنلاین نیست.
- smoke مرورگر تلاش شد، ولی Chrome/CDP به timeout و صفحهٔ خالی رسید؛ تأیید بصری
  کامل این اجرا موفق اعلام نمی‌شود. build و تست قراردادها جایگزین آن نیستند.

محیط `.venv` قبلی ناقص بود؛ برای بررسی `.venv-audit` مجزا ایجاد شد. به‌دلیل timeout
دانلود، بسته‌های مطابق lock از cache محلی بازیابی شدند و Redis از سورس release
رسمی دریافت شد. `uv lock --check --offline` سازگاری lock را تأیید کرد. این پوشه‌ها
و cacheها در Git/Docker وارد نمی‌شوند؛ محیط کاربر حذف نشده است.

CI موجود برای PostgreSQL 17 و Redis واقعی، هر سه گروه تست، بررسی Python، build
و audit فرانت‌اند تنظیم شد. این workflow هنوز از طرف این کار در GitHub اجرا نشده است.

## باقی‌مانده‌های Production

1. اجرای دو تست وابسته روی سرویس واقعی و بررسی عملی grantهای نقش محدود PostgreSQL؛
   سپس تست بار/رقابت لغو، پرداخت و انقضا روی اندازهٔ دادهٔ واقعی.
2. smoke مرورگر، CSP و ورود Google روی دامنهٔ اصلی؛ بررسی ایمیل واقعی و فرستندهٔ تأییدشده.
3. استقرار Redis دارای TLS/ACL، تنظیم دقیق trusted ingress و مانیتورینگ خرابی limiter.
4. worker همیشه‌فعال، پایش تأخیر/خطاهای صف و انقضای سفارش؛ Render Free در خواب
   worker را هم متوقف می‌کند و برای سرویس فروشگاهی همیشه‌فعال کافی نیست.
5. job جداگانهٔ migration برای جداسازی کامل credential، دسترسی محدود Secret Store،
   چرخش کلید با حفظ امکان خواندن jobهای قدیمی، TLS دیتابیس و شبکهٔ خصوصی در صورت امکان.
6. backup/restore آزمایش‌شده، نگه‌داری و حذف کنترل‌شدهٔ session/token/outbox، retention
   برای audit و کپی آن به مقصد جدا برای مقاومت بیشتر در برابر دست‌کاری.
7. درگاه واقعی با اعتبارسنجی سمت سرور، مبلغ/ارز/امضای provider، idempotency و تطبیق
   تسویه. endpoint مدیریت فعلی جایگزین درگاه نیست.
8. audit وابستگی‌های آنلاین مجدد، تست نفوذ مستقل، بررسی DoS و اندازهٔ request در
   ingress، alert و پاسخ‌گویی به رخدادها؛ هیچ ادعای «امنیت کامل و تضمین‌شده» نداریم.

راهنماها: [اجرای محلی بدون Docker](LOCAL_SETUP.fa.md)، [استقرار](DEPLOYMENT.fa.md).
مراجع بررسی: [OWASP نشست](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)،
[اصلاح source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)،
[محدودیت Render Free](https://render.com/docs/free).

## فایل‌های ایجادشده و تغییرکرده

فهرست دقیق فایل‌ها در [CHANGE_MANIFEST.md](CHANGE_MANIFEST.md) آمده است. فایل‌های
README، compose، vite.config و Dockerfile.dev/.dockerignore از پیش تغییرات محلی
داشتند؛ کار قبلی حفظ شد و به حساب تماماً ایجادشده در این refactor گذاشته نشده است.
