"""Curated bilingual documentation; implementation inventories live in inventory.json."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

INTRO = {
'en': '''## How to use this handbook
This is a technical and operational handbook for Nexora Digital Shop, prepared from the repository at the revision shown on the cover. It is intended for the shop owner, administrators, developers and deployment operators. The two editions cover the same system; identifiers, commands and HTTP paths intentionally remain in English.

**Reading paths.** Owners can start with the feature catalogue and daily startup guide. Developers should read the architecture, authentication, API contracts and database dictionary. Operators should focus on configuration, deployment, backups, incident response and acceptance checks.

**Evidence boundaries.** An extracted route means that the route exists in this source revision, not that it is deployed successfully. A configured integration means the adapter is implemented, not that a provider account has usable credit or that a message has been delivered. Historical manual outcomes are not continuous monitoring.

**Privacy.** No real password, database credential, session cookie, BotFather token, personal customer record or private configuration is included. The database model describes columns, not their live contents. Examples use placeholders and test identities.

**Document control.** Baseline date: 15 November 2026 (Asia/Tehran). Repository snapshot and generated API/schema inventories are versioned alongside the source. Review this handbook after changing routes, permissions, schema, hostnames, invoice workflows or deployment topology.

## What complete documentation needs
A useful documentation set needs an agreed scope, audience, actual code revision, architecture, domain vocabulary, user journeys, feature matrix, setup prerequisites, configuration reference, API contracts, data model, access controls, deployment/rollback plan, test strategy, operational procedures, known limitations, ownership and a revision process. Screenshots and diagrams should explain a task, not substitute for reproducible steps.

For this project, those materials are assembled from the source, committed configuration and existing guides. Still requiring owner confirmation are actual shipping/return policies, warranty agreements, tax/legal obligations, production service plan limits, RPO/RTO targets, staff responsibilities, incident contacts, backup schedules and current provider availability. They are recorded as decisions to complete rather than invented facts.

**To maintain this set:** assign a documentation owner; review route/schema changes in the same pull request; refresh the generated inventories; test the startup commands on a clean machine; re-export both languages; inspect the rendered PDFs; record which live checks were actually performed. Never add real credentials to make an example look realistic.
''',
'fa': '''## روش استفاده از این دفترچه
این سند، راهنمای فنی و عملیاتی نکسورا برای مالک فروشگاه، مدیران، توسعه‌دهنده و اپراتور است و بر اساس نسخهٔ کد درج‌شده روی جلد نوشته شده است. دو نسخهٔ زبانی یک سامانه را پوشش می‌دهند؛ شناسه‌ها، فرمان‌ها و مسیرهای HTTP عمداً انگلیسی باقی مانده‌اند.

**مسیر مطالعه.** مالک می‌تواند از فهرست امکانات و اجرای روزمره شروع کند. توسعه‌دهنده بهتر است معماری، احراز هویت، قراردادهای API و فرهنگ داده را بخواند. اپراتور باید تنظیمات، استقرار، پشتیبان‌گیری، پاسخ به رخداد و چک‌لیست پذیرش را مرور کند.

**مرز شواهد.** وجود یک مسیر در فهرست استخراج‌شده یعنی در این نسخهٔ کد پیاده شده، نه اینکه حتماً روی سرور جاری منتشر و سالم باشد. وجود آداپتور سرویس هم به معنی اعتبار حساب، سهمیهٔ قابل مصرف یا تحویل پیام نیست. نتیجهٔ تست دستی گذشته جای پایش مداوم را نمی‌گیرد.

**حریم خصوصی.** هیچ رمز واقعی، اطلاعات اتصال محرمانه، کوکی، توکن BotFather، دادهٔ شخصی مشتری یا env خصوصی در این سند نیست. فرهنگ دیتابیس، ستون‌ها را معرفی می‌کند نه محتویات زندهٔ آن‌ها. مثال‌ها از جای‌نگهدار و هویت آزمایشی استفاده می‌کنند.

**کنترل نسخهٔ سند.** تاریخ مبنا ۱۵ نوامبر ۲۰۲۶، بر اساس منطقهٔ زمانی تهران است. شناسهٔ نسخه و فهرست استخراج‌شدهٔ API و schema همراه منبع سند نگهداری می‌شوند. تغییر route، مجوز، schema، میزبان، جریان فاکتور یا معماری انتشار نیازمند بازبینی سند است.

## برای یک مستند کامل چه لازم است؟
دامنه و مخاطب روشن، نسخهٔ واقعی کد، معماری، واژه‌نامهٔ کسب‌وکار، سناریوهای کاربر، جدول امکانات، پیش‌نیازها، تنظیمات، قرارداد API، مدل داده، کنترل دسترسی، برنامهٔ استقرار و بازگشت، راهبرد تست، دستورالعمل عملیات، محدودیت‌ها، مسئول و فرایند بازبینی لازم‌اند. تصویر و نمودار باید انجام یک کار را روشن کنند؛ جای دستور قابل تکرار را نمی‌گیرند.

در این پروژه، این مواد از کد، تنظیمات ثبت‌شده و راهنماهای موجود گردآوری شده‌اند. مواردی که هنوز تأیید مالک را می‌خواهند عبارت‌اند از سیاست واقعی ارسال/مرجوعی، قرارداد گارانتی، الزامات مالیاتی/حقوقی، محدودیت پلن سرویس‌ها، اهداف RPO/RTO، مسئولیت کارکنان، مخاطب رخداد، زمان‌بندی بکاپ و وضعیت جاری ارائه‌دهندگان. این‌ها تصمیم‌های باز هستند و با اطلاعات ساختگی پر نشده‌اند.

**روش نگهداری سند:** یک مسئول تعیین کنید؛ تغییر route و schema را همراه همان تغییر کد مستند کنید؛ فهرست‌های استخراجی را تازه کنید؛ دستورهای اجرا را روی محیط تمیز بسنجید؛ هر دو زبان را دوباره صادر و PDFها را بازبینی کنید؛ مشخص کنید کدام تست واقعاً زنده بوده است. برای واقعی‌تر نشان‌دادن مثال، اطلاعات محرمانه اضافه نکنید.
'''}

TECH = {
'en': '''## Architecture decisions and boundaries
The repository is a combined storefront/admin frontend plus separately executed backend and bot, not a single process. The active API is the Python layered implementation. Archived ASP.NET sources and the retired Expo application must not be mistaken for required runtime components.

| Decision | Reason and consequence |
| --- | --- |
| Same-origin browser API | Vite/Vercel proxy the API; the browser retains normal cookie and CSRF semantics. Changing a public frontend variable does not rewrite Vercel routing. |
| Separate database roles | Runtime reads/writes only approved application data; an operator/migration credential performs schema and RBAC changes. |
| Stored order snapshots | Customer/address, line prices and conversion rate remain historical records even when the catalogue changes. |
| PostgreSQL durable queues | Enqueue and business updates commit together; jobs survive process restart. Retries still require idempotent business identifiers. |
| Separate wholesale enquiries | Approval issues a quote/invoice, not a paid online order or automatic stock reservation. |
| Local media and database uploads | Bundled images have no runtime third-party dependency; merchant uploads persist in the database. |

### Request flow
1. The browser calls the frontend origin under `/api`.
2. The proxy forwards to FastAPI; middleware validates CSRF for unsafe browser API methods.
3. Dependencies authenticate the session and the application service checks ownership/permissions.
4. Use cases coordinate repositories and domain rules within a transaction.
5. The response returns the camelCase contract; structured errors expose a safe message/code.
6. Workers handle queued email/document work separately from the HTTP request.

### Authentication flow
Fetch `GET /api/csrf` with cookies enabled. Read the JSON `token`, retain the nonce cookie and send `X-CSRF-TOKEN` with `POST /api/auth/login`. Retain the returned session cookie. Login rotates the session, so fetch a fresh CSRF token before later mutations. Read `/api/auth/me` to inspect the user and `/api/admin/me` to check management access. Logout also needs the current CSRF token.

A valid password is not an admin permission. `401 INVALID_CREDENTIALS`, `400 INVALID_CSRF` and `403` after successful authentication are different problems. Production cookies use secure host-scoped names; development uses local HTTP-compatible cookies. Direct Render and Vercel origins maintain separate browser cookie jars even if they reach the same API.

### Data boundaries
Public catalogue data may be cached; account, session, private request details and invoice documents must not be placed in public caches. A Telegram user ID is not a website login. Account linking is a separate expiring, one-time confirmation flow authenticated by a private service credential. Internal bot routes are not exposed by the standard storefront `/api` rewrite.

## Order and enquiry lifecycles
### Website orders
The checkout creates a draft invoice without reserving stock or emptying the cart. A draft expires for submission after the defined draft window (currently 24 hours). Submission checks the cart, current prices, accepted price revision and stock, then reserves inventory and clears the cart transactionally. The ordinary reservation lifetime defaults to 20 minutes. Payment is a separate authorized operator action; no public browser flag marks an order paid.

The typical persisted statuses are `draft`, `pending_payment`, `paid`, `cancelled` and `expired`. Cancelling or expiring a reservation releases inventory once. A stored payment reference supports idempotent confirmation. Historical invoice amounts come from the order snapshot rather than today's product list.

### Telegram wholesale
`new → reviewing/contacted/quoted → approved` describes the common business path; `closed` and `cancelled` are also supported states. The UI/service determines which changes are permitted for the current request. These names are not a promise that every arbitrary state-to-state transition is accepted.

A submitted form receives a request ID. Approval validates the agreed invoice lines, generates a unique eight-digit tracking code, stores the invoice data/PDF and queues delivery in a transaction. Repeating approval does not create a new code or a new PDF. A later template update does not rewrite existing invoices. Delivery state is separate from business approval: approved can still mean queued or failed delivery.

### Documents and money
All customer-visible monetary examples must state rials. The fixed catalogue conversion is `600000`, not a live FX quote. Website invoices retain their recorded rate. Wholesale agreed prices are rial amounts, and UI totals use exact integer arithmetic where implemented. Use database Decimal/server totals for authoritative calculations. A download is not proof of payment; tax invoices, serials and real warranty terms require separate business procedures.

## Frontend organization and accessibility
`src/App.jsx` registers lazy-loaded storefront pages and shared providers for theme, content, shopping and comparison. Private account/recovery pages set noindex metadata. `AdminPanel` is a separate Vite entry built from the root; `/business` is redirected. The public support page has anchored sections and FAQ disclosures with reduced-motion handling.

Preserve RTL visual order while keeping paths, code, email and numeric identifiers readable in isolated LTR spans. Keep keyboard focus visible, use semantic buttons/links, label icon-only controls, and make errors readable without color alone. Test narrow layouts, zoom, long product names, empty states, failed requests and both themes. These are review obligations; the existence of the design does not establish formal WCAG conformance.

Category/product images should match the actual model and use containment where the whole item matters. White-backed user-supplied photos are not transparent-alpha files. Preserve merchant uploads when upgrading known default images. Generate small management previews with the backend's pinned Pillow version, not an arbitrary system encoder.
''',
'fa': '''## تصمیم‌های معماری و مرزها
مخزن از فرانت فروشگاه/پنل و دو برنامهٔ جداگانهٔ بک‌اند و بات تشکیل شده است؛ یک پردازش واحد نیست. API فعال نسخهٔ لایه‌ای Python است. سورس آرشیوی ASP.NET و اپ حذف‌شدهٔ Expo نباید سرویس الزامی اجرا فرض شوند.

| تصمیم | دلیل و پیامد |
| --- | --- |
| API هم‌مبدأ مرورگر | پروکسی Vite/Vercel رفتار کوکی و CSRF را حفظ می‌کند؛ تغییر متغیر عمومی فرانت، rewrite را عوض نمی‌کند. |
| نقش‌های جداگانهٔ دیتابیس | runtime فقط داده‌های مجاز برنامه را می‌خواند/می‌نویسد؛ تغییر schema و RBAC وظیفهٔ اپراتور/مهاجرت است. |
| snapshot سفارش | مشتری، نشانی، قیمت اقلام و نرخ تبدیل، حتی پس از تغییر کاتالوگ سابقهٔ تاریخی باقی می‌مانند. |
| صف پایدار PostgreSQL | تغییر کسب‌وکار و صف‌بندی با هم commit می‌شوند؛ job از restart جان سالم می‌برد ولی retry همچنان شناسهٔ تکرارناپذیر می‌خواهد. |
| جدابودن استعلام عمده | تأیید، فاکتور توافقی صادر می‌کند؛ سفارش پرداخت‌شده یا رزرو خودکار موجودی سایت نیست. |
| تصاویر محلی و آپلود دیتابیسی | عکس همراه پروژه وابستگی زندهٔ خارجی ندارد و عکس مدیر در دیتابیس ماندگار است. |

### مسیر یک درخواست
1. مرورگر زیر `/api` به مبدأ فرانت درخواست می‌دهد.
2. پروکسی آن را به FastAPI می‌فرستد؛ middleware برای عملیات نوشتنی مرورگر CSRF را کنترل می‌کند.
3. dependency نشست را احراز و سرویس کاربردی مالکیت/مجوز را بررسی می‌کند.
4. کاربردها مخزن‌ها و قواعد دامنه را در تراکنش هماهنگ می‌کنند.
5. پاسخ با قرارداد camelCase و پیام/کد خطای امن برمی‌گردد.
6. worker کار صف‌بندی‌شدهٔ ایمیل/فاکتور را جدا از درخواست HTTP انجام می‌دهد.

### جریان احراز هویت
ابتدا `GET /api/csrf` را با پذیرش کوکی بگیرید. مقدار JSON به نام `token` و کوکی nonce را نگه دارید و در `POST /api/auth/login` هدر `X-CSRF-TOKEN` را بفرستید. کوکی نشست برگشتی را حفظ کنید. ورود نشست را عوض می‌کند؛ قبل از mutation بعدی CSRF تازه بگیرید. `/api/auth/me` کاربر و `/api/admin/me` دسترسی مدیریت را بررسی می‌کند. خروج هم CSRF جاری می‌خواهد.

درست‌بودن رمز با مجوز ادمین یکی نیست. `401 INVALID_CREDENTIALS`، خطای `400 INVALID_CSRF` و `403` بعد از احراز موفق، سه مسئلهٔ متفاوت‌اند. کوکی Production امن و محدود به میزبان است؛ development کوکی سازگار با HTTP محلی دارد. Render مستقیم و Vercel، حتی اگر به یک API برسند، ظرف کوکی مرورگر جدا دارند.

### مرز داده
کاتالوگ عمومی می‌تواند کش شود؛ حساب، نشست، جزئیات خصوصی درخواست و سند فاکتور نباید در کش عمومی قرار گیرند. شناسهٔ تلگرام، ورود به حساب وب نیست. اتصال حساب مسیر مستقل یک‌بارمصرف و زمان‌دار با کلید خصوصی سرویس است. مسیرهای داخلی بات از rewrite معمول `/api` فرانت عبور نمی‌کنند.

## چرخهٔ سفارش و درخواست
### سفارش سایت
خرید ابتدا پیش‌فاکتور می‌سازد، بدون رزرو موجودی یا خالی‌کردن سبد. پنجرهٔ ثبت پیش‌فاکتور فعلاً ۲۴ ساعت است. ثبت، سبد و قیمت جاری و بازبینی مبلغ تأییدشده و موجودی را بررسی و رزرو/خالی‌کردن سبد را تراکنشی انجام می‌دهد. مهلت پیش‌فرض رزرو معمول ۲۰ دقیقه است. پرداخت عملیات جدا و مجاز اپراتور است؛ هیچ پرچم مرورگری سفارش را پرداخت‌شده نمی‌کند.

وضعیت‌های متداول ذخیره‌شده `draft`، `pending_payment`، `paid`، `cancelled` و `expired` هستند. لغو یا انقضا موجودی را یک بار آزاد می‌کند. مرجع پرداخت ثبت‌شده برای کنترل تأیید تکراری استفاده می‌شود. مبلغ تاریخی فاکتور از snapshot سفارش می‌آید، نه قیمت امروز محصول.

### عمدهٔ تلگرام
مسیر معمول کسب‌وکار `new → reviewing/contacted/quoted → approved` است؛ `closed` و `cancelled` هم وجود دارند. رابط/سرویس تعیین می‌کند کدام تغییر برای وضعیت جاری مجاز است؛ این نام‌ها مجازبودن هر انتقال دلخواهی را تضمین نمی‌کنند.

فرم ثبت‌شده شمارهٔ درخواست می‌گیرد. تأیید، اقلام توافقی را اعتبارسنجی، کد هشت‌رقمی یکتا تولید، داده و PDF را ذخیره و ارسال را در تراکنش صف‌بندی می‌کند. تکرار تأیید کد یا PDF جدید نمی‌سازد. تغییر قالب، فاکتور قدیمی را بازنویسی نمی‌کند. وضعیت ارسال از تأیید تجاری جداست؛ درخواست تأییدشده می‌تواند هنوز در صف یا ارسال‌ناموفق باشد.

### اسناد و مبلغ
واحد مبلغ برای مشتری باید ریال باشد. ضریب ثابت کاتالوگ `600000` نرخ زندهٔ ارز نیست. فاکتور سایت نرخ ذخیره‌شدهٔ خود را دارد. قیمت توافقی عمده ریالی است و جمع‌ها در رابط‌های مربوط با عدد صحیح دقیق محاسبه می‌شوند. مرجع مبلغ، Decimal و جمع سمت سرور است. دانلود سند، اثبات پرداخت نیست؛ صورتحساب مالیاتی، سریال و شرایط واقعی گارانتی فرایند مستقل می‌خواهند.

## سازمان‌دهی فرانت و دسترس‌پذیری
فایل `src/App.jsx` صفحات lazy و providerهای تم، محتوا، خرید و مقایسه را ثبت می‌کند. صفحات خصوصی حساب/بازیابی noindex دارند. `AdminPanel` ورودی جداگانهٔ Vite است ولی از ریشه build می‌شود؛ `/business` هدایت می‌شود. پشتیبانی عمومی، بخش‌های anchor و FAQ با رعایت کاهش حرکت دارد.

ترتیب بصری RTL را حفظ و کد، ایمیل و مسیر را در بخش مستقل LTR خوانا کنید. فوکوس کیبورد مشخص، دکمه/لینک معنایی، عنوان کنترل آیکونی و پیام خطای قابل فهم بدون اتکای صرف به رنگ لازم‌اند. عرض باریک، zoom، نام طولانی، حالت خالی، خطای شبکه و هر دو تم را تست کنید. این‌ها تعهد بازبینی‌اند؛ وجود طرح به معنی گواهی رسمی WCAG نیست.

عکس باید با مدل واقعی کالا تطبیق داشته باشد و برای نمایش کامل از containment استفاده شود. عکس ارسالی با زمینهٔ سفید، فایل دارای alpha شفاف نیست. اصلاح عکس پیش‌فرض نباید آپلود مدیر را تغییر دهد. پیش‌نمایش مدیریت را با نسخهٔ تثبیت‌شدهٔ Pillow بک‌اند بسازید، نه encoder متفاوت سیستم.
'''}

OPS = {
'en': '''## Operations, monitoring and incident response
### What to observe
Track backend health, public product response latency, login error classes, database connection failures, Redis availability, worker liveness, queue age/retry/dead-letter counts, invoice delivery state and provider quotas. Application JSON logging is present; a complete hosted dashboard/alerting installation is not automatically supplied by this repository.

Use correlation between time, route, error code and deployment revision. Do not record raw passwords, signed links, request cookies, BotFather URLs or unredacted provider responses. Audit records are business/security evidence, not a reason to log secrets.

### Triage sequence
1. Define impact: all users, one administrator, one order, or one external integration?
2. Check the actual deployed revision, health and correct API origin.
3. Verify database target and role without printing the password.
4. Separate authentication, permission, CSRF, network and provider-credit failures.
5. Inspect queue state before retrying a send or approving again.
6. Apply the smallest repair, record the result, and repeat the affected acceptance check.

### Resolved class of incident: local admin versus online admin
Creating a manager on `localhost/nexora` does not create that user on Neon. Even a correct hostname is insufficient if the selected credential is `nexora_app`: it must not be granted RBAC-writing privileges merely to make a command succeed. Use the migration/operator credential for `provision_admin`, inspect host/database/username, and test the actual production origin. A `Read-Host` label is only a prompt; the connection URL must be entered afterwards, not substituted into that label.

An SQL privilege failure inside the account creation transaction rolls back that creation. A generic registration response is not proof that a specific account exists. Do not delete historical users or orders to repair a login. The diagnostic tool compares a securely entered password with the selected database and optionally performs one CSRF-correct login to each fixed project origin, then logs out on success.

### Delivery incidents
For wholesale PDFs, `notificationsConfigured=true` only means a backend token is configured. The worker, Telegram connectivity, customer chat and queue must still work. The bot's `PROXY_URL` does not configure the backend worker; backend HTTPX uses its own process network/proxy settings. Retry ambiguous sends knowing that Telegram may already have accepted the first copy.

## Backup, restore and recovery
Back up PostgreSQL application data, uploaded product media, saved invoice bytes, roles/grants and migration history. Webhook bot state lives in its own schema/role and must be included if that deployment is used. Preserve the stable encryption secret outside the database backup, in an approved secret store; without it, encrypted outstanding email jobs may be unreadable.

Use PostgreSQL-native backups or the database provider's supported backup/restore capabilities. Encrypt backups, restrict access and test restoration into an isolated environment. A Git clone is not a database backup. Do not put backups or `.env` files into Git. Do not test restoration over production.

The owner must choose a recovery point objective (acceptable data loss) and recovery time objective (acceptable outage). No guaranteed RPO/RTO is defined by the current code. A restore exercise should verify row counts, media retrieval, invoice downloads, a test login, queue handling and role separation before traffic is switched.

## Security and privacy review
| Boundary | Threat / required control |
| --- | --- |
| Browser → API | Credential theft, CSRF and unsafe output: HTTPS, HttpOnly cookies, token validation, escaped document fields and policy headers. |
| Admin → business data | Unauthorized price/order changes: explicit capabilities, audit trail, controlled operator provisioning. |
| API → database | Excess privilege and destructive access: separate roles, grants, reviewed migrations and backups. |
| Bot → internal routes | Forged submissions and data leakage: private shared service key, per-user ownership and validated IDs. |
| Worker → providers | Leaked token URLs, retry ambiguity and provider outages: redacted output, durable state and scoped credentials. |
| Upload/import | Oversized files, misleading formats and spreadsheet abuse: content/dimension limits, supported formats and server-side validation. |

Rotate any exposed credentials in the issuing service and update all consumers. Keep the website admin password, PostgreSQL role password, BotFather token, service key, webhook secret and application encryption secret conceptually separate. Do not weaken runtime grants to repair operator mistakes.

Customer name, phone, address and Telegram ID are personal data. Limit administrator access and exported files, define retention/deletion rules with the business owner, and consider jurisdiction-specific obligations. No legal compliance certification, retention schedule or tax approval is implied by the implementation.

## Testing strategy and acceptance
### Automated layers
Unit tests cover domain rules and utility behavior. Integration/security tests exercise API contracts, permissions, sessions, transactions and isolation. Quick SQLite tests are useful doubles but do not validate PostgreSQL lock behavior. Dedicated PostgreSQL/Redis test services exercise the real concurrency/rate-limit mechanisms. Browser fixture checks cover UI states and responsive rendering; they do not prove live provider delivery.

### Release acceptance checklist
- Clean install from lockfiles; lint, build and appropriate backend/bot suites pass.
- Migrations/grants applied to the intended database; restricted runtime role remains restricted.
- Guest catalogue, category filters, comparison and both themes work at narrow and desktop widths.
- Admin login, CSRF renewal, permission denial and logout are tested on the deployed origin.
- A test website order preserves its address, amount and invoice after catalogue edits.
- A test wholesale request reaches the intended admin panel, is approved once and returns the identical saved PDF to the correct Telegram user.
- Mail verification/recovery and provider-backed assistant are tested only with configured operational providers.
- Backup/restore plan, queue behavior, known limitations and rollback decision are recorded.

### Validation of this publication
The PDF build validates generated API/table counts against the captured inventory, checks page overflow and missing glyph coverage, verifies embedded fonts and extracts PDF text, and renders sample pages for visual inspection. These publication checks are not a rerun or certification of every live project feature.

## Release, rollback and change management
Use a reviewed change, keep the dependency locks, back up before risky schema work, run checks, apply migrations with the operator credential, apply grants, deploy API/worker and frontend with compatible contracts, then run smoke checks. Deploy the bot separately when its contract/state changes. Free service cold starts and region differences affect timings.

Rollback is not simply running an old frontend against a new API. Determine schema and contract compatibility first. Database downgrades may delete media or precision; prefer a reviewed forward fix when safer. Do not replay payment/approval mutations or delete queues blindly during recovery. Saved invoices are historical documents.

Maintain a short release record: revision, operator, migration head, config changes without secret values, backups, checks actually run, deployment IDs, known risks and rollback decision. The operating owner, on-call contact and review cadence are organizational decisions still to assign.

## Known gaps and roadmap decisions
The store does not currently include an integrated banking gateway, a Telegram Mini App, marketing campaign delivery, native mobile push, automated warranty case management or certified tax invoicing. Seed/demo prices and the daily deals clock are not a supplier feed or a real campaign scheduler.

Useful next decisions are actual commercial shipping/return rules, model-specific warranty data, production backup/monitoring ownership, end-to-end staging acceptance, a payment-provider design, and a true campaign expiry model if required. Prioritize these by business value and operational risk; do not label a proposal as delivered functionality.
''',
'fa': '''## عملیات، پایش و پاسخ به رخداد
### چه چیزهایی پایش شوند؟
سلامت بک‌اند، تأخیر کاتالوگ، نوع خطای ورود، خطای اتصال دیتابیس، Redis، زنده‌بودن worker، سن صف و retry/dead-letter، وضعیت فاکتور و سهمیهٔ سرویس‌ها را دنبال کنید. لاگ JSON برنامه وجود دارد؛ داشبورد و هشداردهی کامل میزبانی خودکار با مخزن نصب نمی‌شود.

زمان، route، کد خطا و revision دیپلوی را کنار هم ببینید. رمز خام، لینک امضاشده، کوکی، URL دارای توکن BotFather و پاسخ خام حساس سرویس را لاگ نکنید. گزارش ممیزی مدرک کسب‌وکار/امنیت است، نه مجوز ثبت secret.

### ترتیب عیب‌یابی
1. دامنهٔ اثر را مشخص کنید: همهٔ کاربران، یک مدیر، یک سفارش یا یک سرویس خارجی؟
2. نسخهٔ منتشرشده، سلامت و مبدأ واقعی API را بررسی کنید.
3. مقصد و نقش دیتابیس را بدون چاپ رمز تأیید کنید.
4. خطای رمز، مجوز، CSRF، شبکه و اعتبار ارائه‌دهنده را جدا کنید.
5. پیش از retry یا تأیید دوباره، وضعیت صف را ببینید.
6. کمترین اصلاح لازم را اعمال، نتیجه را ثبت و سناریوی مربوط را تکرار کنید.

### نمونهٔ رخداد: مدیر لوکال در برابر مدیر آنلاین
ساخت مدیر در `localhost/nexora` آن حساب را در Neon ایجاد نمی‌کند. حتی hostname درست کافی نیست اگر اعتبار انتخاب‌شده `nexora_app` باشد؛ برای راه‌افتادن یک دستور نباید به runtime مجوز نوشتن RBAC داد. `provision_admin` با اعتبار اپراتور/مهاجرت اجرا می‌شود؛ میزبان، دیتابیس و username را بررسی و مبدأ واقعی سایت را تست کنید. متن `Read-Host` فقط عنوان سؤال است و URL باید بعد از نمایش سؤال وارد شود، نه داخل عنوان آن.

خطای مجوز SQL در تراکنش ساخت حساب، آن ایجاد را rollback می‌کند. پاسخ عمومی ثبت‌نام هم وجود قطعی یک حساب را ثابت نمی‌کند. برای تعمیر ورود، کاربر یا سابقهٔ سفارش را حذف نکنید. ابزار تشخیص رمز مخفی را با دیتابیس انتخاب‌شده تطبیق و در حالت اختیاری، یک ورود با CSRF درست به هر یک از دو مبدأ ثابت پروژه انجام می‌دهد و پس از موفقیت خارج می‌شود.

### رخداد تحویل فاکتور
`notificationsConfigured=true` فقط وجود تنظیم توکن بک‌اند را نشان می‌دهد. worker، شبکهٔ تلگرام، چت مشتری و صف باید سالم باشند. `PROXY_URL` بات، worker بک‌اند را تنظیم نمی‌کند؛ HTTPX بک‌اند از تنظیمات شبکه/پراکسی پردازش خودش استفاده می‌کند. هنگام retry مبهم در نظر بگیرید تلگرام شاید نسخهٔ اول را پذیرفته باشد.

## پشتیبان‌گیری، بازیابی و تداوم
از دادهٔ PostgreSQL، تصاویر آپلودشده، بایت PDFهای صادرشده، نقش‌ها/grantها و تاریخچهٔ migration بکاپ بگیرید. وضعیت webhook بات schema/نقش جدا دارد و در صورت استفاده باید پوشش داده شود. secret پایدار رمزگذاری را خارج از بکاپ دیتابیس در مخزن امن نگه دارید؛ بدون آن jobهای ایمیل رمزگذاری‌شدهٔ باقی‌مانده ممکن است خوانده نشوند.

از بکاپ بومی PostgreSQL یا قابلیت رسمی ارائه‌دهنده استفاده کنید. بکاپ رمزگذاری و دسترسی آن محدود شود و بازیابی در محیط جدا تست شود. clone گیت بکاپ دیتابیس نیست. بکاپ یا env را وارد Git نکنید و تمرین restore را روی Production انجام ندهید.

مالک باید RPO، یعنی میزان قابل قبول ازدست‌رفتن داده، و RTO، یعنی زمان قابل قبول قطعی، را تعیین کند؛ کد هدف تضمین‌شده‌ای تعریف نمی‌کند. تمرین بازیابی باید تعداد رکورد، تصویر، دانلود فاکتور، ورود آزمایشی، صف و تفکیک نقش را قبل از تغییر ترافیک بررسی کند.

## بازبینی امنیت و حریم خصوصی
| مرز | تهدید و کنترل لازم |
| --- | --- |
| مرورگر به API | سرقت اعتبار، CSRF و خروجی ناامن؛ HTTPS، کوکی HttpOnly، اعتبارسنجی توکن، escape متن سند و هدر سیاست. |
| مدیر به دادهٔ تجاری | تغییر غیرمجاز قیمت/سفارش؛ capability صریح، ممیزی و ابزار اپراتور کنترل‌شده. |
| API به دیتابیس | دسترسی بیش از حد و حذف مخرب؛ نقش جدا، grants، migration بازبینی‌شده و بکاپ. |
| بات به مسیر داخلی | جعل درخواست و نشت داده؛ کلید خصوصی سرویس، مالکیت هر کاربر و شناسهٔ معتبر. |
| worker به ارائه‌دهنده | نشت URL توکن، ابهام retry و قطعی؛ خروجی پالایش‌شده، وضعیت پایدار و اعتبار محدود. |
| آپلود و ورود فایل | حجم زیاد، فرمت فریبنده و سوءاستفادهٔ اکسل؛ محدودیت محتوا/ابعاد، فرمت مجاز و اعتبارسنجی سرور. |

اعتبار افشاشده را در سرویس صادرکننده تعویض و همهٔ مصرف‌کننده‌ها را به‌روز کنید. رمز ادمین سایت، رمز نقش PostgreSQL، توکن BotFather، کلید سرویس، webhook secret و secret رمزگذاری برنامه شش مفهوم متفاوت‌اند. برای جبران اشتباه اپراتور، مجوز runtime را تضعیف نکنید.

نام، تلفن، نشانی و شناسهٔ تلگرام دادهٔ شخصی هستند. دسترسی مدیر و فایل‌های export را محدود و سیاست نگهداری/حذف را با مالک و الزامات محل فعالیت تعیین کنید. پیاده‌سازی، گواهی انطباق حقوقی، زمان‌بندی retention یا تأیید مالیاتی نیست.

## راهبرد تست و پذیرش
### لایه‌های خودکار
تست واحد قواعد دامنه و ابزارها را بررسی می‌کند. تست یکپارچه/امنیت، قرارداد API و مجوز و نشست و تراکنش و جداسازی را می‌سنجد. SQLite موقت test double مفیدی است ولی قفل PostgreSQL را اثبات نمی‌کند. سرویس PostgreSQL/Redis اختصاصی تست، رقابت و محدودساز واقعی را بررسی می‌کند. تست مرورگر با fixture، حالت رابط و اندازه‌ها را می‌سنجد، نه تحویل زندهٔ سرویس.

### چک‌لیست پذیرش انتشار
- نصب تمیز از lockfile، موفقیت lint/build و تست‌های مرتبط بک‌اند و بات.
- migration و grants در دیتابیس درست؛ runtime همچنان محدود.
- کاتالوگ مهمان، فیلتر، مقایسه و هر دو تم در موبایل و دسکتاپ.
- ورود ادمین، تجدید CSRF، رد مجوز نامعتبر و خروج روی مبدأ منتشرشده.
- حفظ آدرس، مبلغ و فاکتور سفارش آزمایشی پس از ویرایش محصول.
- رسیدن استعلام عمدهٔ آزمایشی به پنل درست، یک تأیید و تحویل همان PDF به کاربر صحیح تلگرام.
- تست تأیید/بازیابی ایمیل و دستیار ارائه‌دهنده فقط با سرویس آماده.
- ثبت برنامهٔ restore، رفتار صف، محدودیت‌ها و تصمیم rollback.

### اعتبارسنجی همین انتشار PDF
ساخت PDF تعداد API/جدول را با inventory تطبیق، بیرون‌زدگی صفحات و پوشش نویسه‌ها را کنترل، فونت تعبیه‌شده و متن PDF را بررسی و صفحه‌های نمونه را تصویری بازبینی می‌کند. این‌ها تست انتشار سند هستند و گواهی همهٔ قابلیت‌های زندهٔ پروژه نیستند.

## انتشار، بازگشت و مدیریت تغییر
تغییر بازبینی‌شده، lockfile ثابت، بکاپ پیش از schema پرخطر، اجرای تست، migration با اعتبار اپراتور، اعمال grants و انتشار API/worker و فرانت سازگار لازم است؛ سپس smoke test انجام شود. بات در تغییر قرارداد/وضعیت جدا منتشر می‌شود. خواب سرویس رایگان و فاصلهٔ منطقه‌ها بر تأخیر اثر دارند.

Rollback صرفاً اجرای فرانت قدیمی روی API جدید نیست؛ ابتدا سازگاری schema/قرارداد را بسنجید. downgrade می‌تواند تصویر یا دقت مبلغ را حذف کند؛ اگر امن‌تر است forward fix بازبینی‌شده انتخاب کنید. mutation پرداخت/تأیید را کورکورانه تکرار و صف را پاک نکنید. فاکتور صادرشده سند تاریخی است.

برای هر انتشار revision، اپراتور، سر migration، تغییر تنظیمات بدون secret، بکاپ، تست واقعاً اجراشده، شناسهٔ دیپلوی، ریسک و تصمیم بازگشت را ثبت کنید. مسئول عملیات، مخاطب کشیک و دورهٔ بازبینی تصمیم سازمانی باز هستند.

## شکاف‌های فعلی و تصمیم‌های آینده
درگاه بانکی یکپارچه، مینی‌اپ تلگرام، ارسال کمپین بازاریابی، push بومی موبایل، مدیریت خودکار پروندهٔ گارانتی و فاکتور رسمی مالیاتی فعلاً وجود ندارند. قیمت نمونه و ساعت روزانهٔ پیشنهادها، خوراک تأمین‌کننده یا زمان‌بندی واقعی کمپین نیستند.

گام‌های تصمیم بعدی می‌توانند سیاست واقعی ارسال/مرجوعی، ضمانت هر مدل، مالکیت بکاپ/پایش، staging انتهابه‌انتها، طراحی اتصال درگاه و مدل زمان پایان واقعی کمپین باشند. اولویت را با ارزش تجاری و ریسک عملیاتی تعیین کنید؛ پیشنهاد را قابلیت تحویل‌شده معرفی نکنید.
'''}

EN_RUNBOOK = '''## Windows setup and daily startup — no Docker
### Prepare once
Use Git, Node 22.12+, Python 3.13, uv and PostgreSQL 17. Clone only if the repository is absent; otherwise preserve local edits and pull with fast-forward only. The examples assume `D:\\nexoraShop`. A copied Python virtual environment is not portable; install from the lockfile instead.

```powershell
cd D:\\nexoraShop
git status
git pull --ff-only origin main
```

PostgreSQL must be running as a Windows service. For a new database only, use your installed psql path, create `nexora`, then run the role-provision script. Existing databases/roles must not be recreated or dropped.

```powershell
Get-Service *postgres*
& 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe' -h localhost -U postgres -c 'CREATE DATABASE nexora;'
& 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe' -h localhost -U postgres -d nexora -f backend/scripts/provision.sql
```

### Backend environment
Copy the example only when the real file does not exist. Enter your own role passwords, URL-encoding special characters. Never copy the example over an existing private file.

```powershell
cd D:\\nexoraShop\\backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

```dotenv
ENVIRONMENT=development
DATABASE_URL=postgresql+psycopg://nexora_app:APP_PASSWORD@localhost:5432/nexora
MIGRATION_DATABASE_URL=postgresql+psycopg://nexora_migrator:MIGRATION_PASSWORD@localhost:5432/nexora
SECRET_KEY=REPLACE_WITH_PRIVATE_STABLE_RANDOM_SECRET
FRONTEND_URL=http://localhost:3000
MIGRATE_ON_START=true
RUN_WORKER=true
REDIS_URL=
REQUIRE_VERIFIED_EMAIL=false
TELEGRAM_BOT_USERNAME=NexoraShopHelperBot
TELEGRAM_BOT_API_KEY=REPLACE_WITH_PRIVATE_SHARED_KEY
TELEGRAM_BOT_TOKEN=REPLACE_WITH_BOTFATHER_TOKEN
```

Disabling verification is a local demo exception, not a production fix. Use a real email provider for verification/recovery tests. Keep the application secret stable and distinct from the bot service key. Production needs Redis; local development can use the in-memory limiter.

### Terminal 1 — backend and worker
```powershell
cd D:\\nexoraShop\\backend
$env:UV_PROJECT_ENVIRONMENT = '.venv-admin'
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
uv sync --frozen
uv run --frozen python start.py
```

With migrations enabled, startup applies schema/seed/grants and supervises the API and worker. Wait for `Application startup complete`; the server waiting on its final log line is normal. Test health in another terminal:

```powershell
curl.exe --noproxy "*" --max-time 10 http://127.0.0.1:8000/health
```

### Terminal 2 — storefront and admin
```powershell
cd D:\\nexoraShop
npm ci --no-audit --no-fund
npm run dev
```

Open `http://localhost:3000` and `http://localhost:3000/admin`. Vite proxies API calls to local port 8000. No separate Expo application or frontend API secret is needed. Keep port 3000 free or deliberately reconcile the configured origin if using another port. Daily startup does not need `npm ci` unless dependencies changed.

### Local administrator
After migrations finish, an operator can create/reset a development-only localhost admin. This helper refuses remote/Neon URLs.

```powershell
cd D:\\nexoraShop\\backend
$env:UV_PROJECT_ENVIRONMENT = '.venv-admin'
uv run --frozen python -m app.setup_local_admin YOUR_EMAIL
```

Enter a private password of 12–128 characters twice. No characters/stars appear while typing. There is no default admin password, and this does not change online accounts.

### Terminal 3 — bot configuration and polling
```powershell
cd D:\\nexoraShop\\telegram_bot
uv sync --frozen
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

```dotenv
BOT_TOKEN=REPLACE_WITH_BOTFATHER_TOKEN
NEXORA_API_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000
TELEGRAM_BOT_API_KEY=REPLACE_WITH_THE_SAME_BACKEND_SERVICE_KEY
PROXY_URL=http://127.0.0.1:12334
PRODUCTS_PATH=/api/products
PRODUCT_DETAIL_PATH=/api/products/{id}
PRICE_SUFFIX=" ریال"
PAGE_SIZE=5
DATA_DIR=./data
```

Port 12334 is an example of the user's Hiddify Mixed/HTTP port. Use the actual connected proxy, or leave it blank for direct access. Keep local API calls out of external proxy routing. The bot token equals backend `TELEGRAM_BOT_TOKEN`; the shared `TELEGRAM_BOT_API_KEY` is different and must match on both sides (32+ characters).

```powershell
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
uv run --frozen python preflight.py --customer-service
uv run --frozen python preflight.py --telegram
uv run --frozen python main.py
```

Stop after any failed preflight and fix it first. `getMe` validates Telegram access/token; configured invoice delivery does not prove actual delivery. Use `/start` in the private bot chat, submit a test enquiry, inspect `/admin#customer-requests`, approve only the test request and compare the PDF received by the same customer with the saved admin PDF. Never run a second poller or compete with an active webhook.

### Backend PDF delivery through a local proxy
The worker is separate from the bot. If direct Telegram access fails, configure the backend process before starting it; do not put a laptop localhost proxy on Render.

```powershell
$env:HTTPS_PROXY = 'http://127.0.0.1:12334'
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
uv run --frozen python start.py
```

### Stop and update
Use Ctrl+C in each process terminal. Closing the polling terminal, sleeping or shutting down the computer stops the local bot. PostgreSQL data remains. Stop processes before pulling updates, sync each changed lockfile, restart the backend for schema/seed work, then restart frontend/bot. Do not reset local edits or delete databases to fix a startup error.

### Common failures
| Symptom | First investigation |
| --- | --- |
| No pyproject.toml | Use `backend` or `telegram_bot`, not `telegram-bot`. |
| Missing pyvenv.cfg / rename denied | Select a new virtual-environment directory and sync; do not copy or delete a running environment. |
| API health fails | PostgreSQL service, target/role/password, migration logs, port and firewall. |
| Bot ApiNetworkError | Direct backend URL, DNS/proxy and backend health. |
| Shared key rejected | Match bot and actual destination backend key; check shell overrides and restart. |
| Request missing in admin | Bot and panel may use different APIs/databases; inspect filters too. |
| Invoice delivery false/fails | Backend token, worker, queue and backend's Telegram network route. |
| Invalid credentials / CSRF / forbidden | Separate password/database, cookie/token and permission problems. |
| Old deal photo | Update/redeploy frontend and hard refresh; known legacy placeholders are resolved by current code. |

A fresh environment without altering the old one:

```powershell
$env:UV_PROJECT_ENVIRONMENT = '.venv-local-fresh'
uv sync --frozen
uv run --frozen python start.py
```

## Online admin: operator provisioning and diagnosis
The online database is independent of localhost. Confirm the actual production database branch, database name and role before account operations. `DATABASE_URL` uses the restricted app role; `MIGRATION_DATABASE_URL` must use the authorized migration/operator role, not `nexora_app`.

Prompt for the URL rather than putting a credential in shell history:

```powershell
cd D:\\nexoraShop\\backend
$env:UV_PROJECT_ENVIRONMENT = '.venv-admin'
$dbSecret = Read-Host "Paste Render MIGRATION_DATABASE_URL" -AsSecureString
$env:MIGRATION_DATABASE_URL = [System.Net.NetworkCredential]::new("", $dbSecret).Password
uv run --frozen python -c "from app.config import Settings; from sqlalchemy.engine import make_url; u=make_url(Settings().migration_database_url.get_secret_value()); print('HOST:',u.host); print('DATABASE:',u.database); print('DB_USER:',u.username)"
```

The quoted `Read-Host` text is a label; paste the private URL only after the prompt appears. Expected target is the actual Neon host/database and `nexora_migrator`. Do not replace only the role name inside an app URL: role passwords differ.

For an absent account, create it directly without customer signup:

```powershell
uv run --frozen python -m app.provision_admin YOUR_EMAIL --create --set-password
```

For an existing account, reset/grant without `--create`:

```powershell
uv run --frozen python -m app.provision_admin YOUR_EMAIL --set-password
```

Creation refuses to overwrite an existing account. Password reset revokes prior sessions/tokens. Neither operation should be repeated casually. Email ownership is not automatically verified. Use the new credentials on the actual Vercel `/admin` page; no frontend redeploy is needed merely for a database account change. Close the operator terminal afterwards so its remote database override is not reused for local startup.

For diagnosis, not another reset:

```powershell
uv run --frozen python -m app.diagnose_admin YOUR_EMAIL --online
```

This prompts explicitly for the Render migration URL and current password, checks the selected database, then performs one login per fixed project origin with valid cookies/CSRF and attempts logout. It can create login/logout audit events and consume rate limits. `DATABASE_PASSWORD_OK` plus a Render credential failure points to target/deployment mismatch; Render success plus Vercel failure points toward proxy/cookies/deployment. `ADMIN_HTTP_403` after `LOGIN_OK` is authorization, not a bad password.
'''

EXAMPLES = {
'en': '''## API contract examples and integration rules
These examples describe shapes, not usable credentials. Use the authoritative field/validation appendix for exact constraints. Do not paste production secrets into curl commands, screenshots or support messages.

### Authenticated browser mutation
```http
GET /api/csrf
Accept: application/json
```

```json
{"token":"<64-character CSRF token>"}
```

Retain cookies, then send a JSON login body and `X-CSRF-TOKEN`. Every later mutation uses the current session-bound CSRF token. The bot service key is not a substitute for browser session authentication.

```json
{"email":"operator@example.test","password":"<private password>"}
```

### Create a draft invoice
```json
{
  "shippingAddress": {
    "recipient": "Test recipient", "phone": "09123456789",
    "province": "Tehran", "city": "Tehran",
    "postalCode": "1234567890", "address": "Test street",
    "building": "12", "unit": "2", "notes": "Test only"
  }
}
```

Submit the returned draft only after inspecting its amount/revision. Product prices, total and paid status are server decisions; never trust a client-supplied monetary total.

### Internal bot enquiry
```json
{
  "request_key": "00000000-0000-4000-8000-000000000001",
  "telegram_user_id": 123456789,
  "telegram_username": "test_customer",
  "kind": "wholesale",
  "details": {
    "name": "Test customer", "phone": "09123456789",
    "company": "", "items": "Requested model and quantity",
    "quantity": 10, "city": "Tehran", "address": "Test address",
    "notes": "Test only"
  }
}
```

Send internal requests directly to the backend with `X-Telegram-Bot-Key`. Keep the request UUID stable when retrying the same confirmation. Do not allow a browser to choose another customer's Telegram identity or expose the service key in frontend code.

### Error interpretation
| Status/code | Interpretation |
| --- | --- |
| 400 / INVALID_CSRF | Missing or invalid session-bound CSRF; not a password verdict. |
| 401 / INVALID_CREDENTIALS | Login identity/password not accepted by that API. |
| 401 / UNAUTHENTICATED | Missing/invalid session for a protected endpoint. |
| 403 | Permission denied; inspect authenticated account and required capability. |
| 404 | Missing resource, outdated deployment, or wrong API origin. |
| 409 | State/version conflict; refresh and review before resubmitting. |
| 413 / 422 | Size or validation failure; use the schema/import limits. |
| 429 | Rate limit; honor retry guidance rather than automatic repeated login. |
| 5xx | Server/provider/readiness issue; inspect safe logs and deployment. |

The generated reference lists declared response contracts. Middleware/business errors may return additional statuses not individually enumerated in OpenAPI; do not interpret the generated list as exhaustive runtime behavior.
''',
'fa': '''## مثال قرارداد API و قواعد اتصال
مثال‌ها شکل داده را نشان می‌دهند، نه اعتبار قابل استفاده. محدودیت دقیق فیلدها در پیوست اعتبارسنجی آمده است. secret واقعی را در curl، اسکرین‌شات یا پیام پشتیبانی قرار ندهید.

### عملیات مرورگر احرازشده
```http
GET /api/csrf
Accept: application/json
```

```json
{"token":"<64-character CSRF token>"}
```

کوکی را حفظ و بدنهٔ JSON ورود را همراه `X-CSRF-TOKEN` ارسال کنید. هر mutation بعدی CSRF وابسته به نشست جاری می‌خواهد. کلید سرویس بات جای احراز هویت نشست مرورگر نیست.

```json
{"email":"operator@example.test","password":"<private password>"}
```

### ساخت پیش‌فاکتور
```json
{
  "shippingAddress": {
    "recipient": "Test recipient", "phone": "09123456789",
    "province": "Tehran", "city": "Tehran",
    "postalCode": "1234567890", "address": "Test street",
    "building": "12", "unit": "2", "notes": "Test only"
  }
}
```

پیش‌فاکتور برگشتی را پس از بررسی مبلغ و revision ثبت کنید. قیمت محصول، جمع و وضعیت پرداخت تصمیم سمت سرورند؛ مبلغ کل ارسالی کلاینت معتبر فرض نمی‌شود.

### درخواست داخلی بات
```json
{
  "request_key": "00000000-0000-4000-8000-000000000001",
  "telegram_user_id": 123456789,
  "telegram_username": "test_customer",
  "kind": "wholesale",
  "details": {
    "name": "Test customer", "phone": "09123456789",
    "company": "", "items": "Requested model and quantity",
    "quantity": 10, "city": "Tehran", "address": "Test address",
    "notes": "Test only"
  }
}
```

مسیر داخلی مستقیم به بک‌اند با `X-Telegram-Bot-Key` فراخوانی می‌شود. UUID برای retry همان تأیید ثابت بماند. مرورگر نباید شناسهٔ مشتری تلگرام دیگر را انتخاب کند یا کلید سرویس در فرانت افشا شود.

### تفسیر خطا
| وضعیت/کد | معنی |
| --- | --- |
| 400 / INVALID_CSRF | CSRF نامعتبر/غایب؛ نتیجهٔ بررسی رمز نیست. |
| 401 / INVALID_CREDENTIALS | هویت/رمز ورود در همان API پذیرفته نشده است. |
| 401 / UNAUTHENTICATED | نشست لازم برای مسیر خصوصی وجود ندارد/معتبر نیست. |
| 403 | مجوز رد شده؛ حساب احرازشده و capability را ببینید. |
| 404 | منبع ناموجود، دیپلوی قدیمی یا مقصد اشتباه API. |
| 409 | تعارض وضعیت/نسخه؛ قبل از ارسال دوباره تازه‌سازی و بازبینی کنید. |
| 413 / 422 | حجم یا اعتبارسنجی؛ محدودیت schema/ورود فایل را رعایت کنید. |
| 429 | محدودیت نرخ؛ از تکرار خودکار ورود پرهیز و زمان انتظار را رعایت کنید. |
| 5xx | خطای سرور/ارائه‌دهنده/آمادگی؛ لاگ امن و دیپلوی را بررسی کنید. |

مرجع تولیدی، پاسخ‌های اعلام‌شده در قرارداد را فهرست می‌کند. خطای middleware یا کسب‌وکار ممکن است status دیگری بدهد که جدا در OpenAPI ثبت نشده؛ فهرست تولیدی همهٔ رفتار runtime نیست.
'''}

WEBHOOK = {
'en': '''## Bot webhook hosting and persistent state
Local polling is convenient for development; continuous service needs a separate bot deployment. Do not replace the storefront Vercel project or the API service with the bot. Review current commercial-use and resource terms for the chosen hosting plan; no free plan is assumed suitable for every store.

### Persistence boundary
The webhook uses a restricted `nexora_bot_app` role and independent `nexora_bot` schema. `user_state` stores bot/user IDs, JSONB state and update time; `processed_updates` stores bot/update receipt IDs and creation time; `media` caches Telegram file IDs by bot/key. These three tables supplement the 22 storefront tables. The bot must not read storefront users/orders directly.

An operator creates the restricted bot role with its own private password and prepares the schema using the setup credential locally. Keep the migration URL out of hosted runtime settings.

```powershell
cd D:\\nexoraShop\\telegram_bot
uv run --frozen python setup_database.py --runtime-role nexora_bot_app
```

Set the private `BOT_MIGRATION_DATABASE_URL` only for setup. Runtime uses the restricted pooled `BOT_DATABASE_URL`. Configure `BOT_TOKEN`, a separate `WEBHOOK_SECRET`, direct `NEXORA_API_URL`, `FRONTEND_URL` and the shared `TELEGRAM_BOT_API_KEY` for customer-care/account-linking routes. Clear any laptop-local proxy on the host.

### Hosting and activation
For a separate eligible Vercel bot project, Root Directory is `telegram_bot`, preset Other, with its own `vercel.json`; do not use the storefront Vite output settings. For a separate Render Python service, the repository provides a bot blueprint. The deployment guide's example start command is:

```sh
uv run --frozen --no-dev uvicorn webhook_app:app --host 0.0.0.0 --port $PORT
```

Before registering the webhook, verify the public bot service health, secret-header rejection and authenticated validation without sending a chat message. Stop all pollers, then deliberately activate the webhook:

```powershell
uv run --frozen python manage_webhook.py check --url https://YOUR-BOT-HOST/api/telegram
uv run --frozen python manage_webhook.py set --url https://YOUR-BOT-HOST/api/telegram
uv run --frozen python manage_webhook.py status
```

`set` changes live Telegram routing. Do not run it as a harmless diagnostic. Deployment protection must not block Telegram's public endpoint; secret-header checks remain required. The implementation completes request work before returning success and records successful update receipts, but ambiguous partial sends can still repeat on retry.

For a planned return to polling, stop the webhook deployment/traffic path as appropriate, delete the registration with the provided tool, then start one poller. The management commands do not discard pending updates. Run `maintenance.py` as an explicitly scheduled operation to prune old receipts/navigation; the repository does not automatically schedule it. Local JSON language settings are not automatically migrated into hosted bot state.
''',
'fa': '''## میزبانی webhook بات و وضعیت ماندگار
Polling برای توسعه مناسب است؛ اجرای مداوم سرویس بات جدا می‌خواهد. پروژهٔ Vercel فروشگاه یا سرویس API را با بات جایگزین نکنید. شرایط جاری استفادهٔ تجاری و منابع پلن میزبان را بررسی کنید؛ رایگان‌بودن برای همهٔ فروشگاه‌ها مناسب فرض نمی‌شود.

### مرز نگهداری داده
Webhook از نقش محدود `nexora_bot_app` و schema مستقل `nexora_bot` استفاده می‌کند. جدول `user_state` شناسهٔ بات/کاربر، JSONB وضعیت و زمان تغییر را نگه می‌دارد؛ `processed_updates` رسید شناسهٔ بات/آپدیت و زمان ساخت را ثبت می‌کند؛ `media` شناسهٔ فایل تلگرام را بر اساس بات/کلید کش می‌کند. این سه جدول علاوه بر ۲۲ جدول فروشگاه‌اند. بات نباید مستقیماً جدول حساب/سفارش فروشگاه را بخواند.

اپراتور نقش محدود بات را با رمز خصوصی مستقل ایجاد و با اعتبار آماده‌سازی، schema را از محیط محلی می‌سازد. URL مهاجرت را وارد runtime میزبان نکنید.

```powershell
cd D:\\nexoraShop\\telegram_bot
uv run --frozen python setup_database.py --runtime-role nexora_bot_app
```

`BOT_MIGRATION_DATABASE_URL` فقط برای setup خصوصی است. runtime از `BOT_DATABASE_URL` محدود و pooled استفاده می‌کند. `BOT_TOKEN`، یک `WEBHOOK_SECRET` مستقل، آدرس مستقیم `NEXORA_API_URL`، `FRONTEND_URL` و کلید مشترک `TELEGRAM_BOT_API_KEY` برای خدمات مشتری/اتصال حساب لازم‌اند. پراکسی localhost لپ‌تاپ را روی میزبان حذف کنید.

### میزبانی و فعال‌سازی
در پروژهٔ مستقل و واجد شرایط Vercel، ریشه `telegram_bot` و preset برابر Other است و از vercel.json همان پوشه استفاده می‌شود؛ تنظیم خروجی Vite فروشگاه را نگذارید. برای Render Python مستقل هم blueprint بات موجود است. فرمان نمونهٔ شروع:

```sh
uv run --frozen --no-dev uvicorn webhook_app:app --host 0.0.0.0 --port $PORT
```

پیش از ثبت webhook، سلامت عمومی، رد هدر نامعتبر و اعتبارسنجی با secret صحیح را بدون ارسال پیام چت بررسی کنید. همهٔ pollerها را متوقف و سپس آگاهانه webhook را ثبت کنید:

```powershell
uv run --frozen python manage_webhook.py check --url https://YOUR-BOT-HOST/api/telegram
uv run --frozen python manage_webhook.py set --url https://YOUR-BOT-HOST/api/telegram
uv run --frozen python manage_webhook.py status
```

فرمان `set` مسیر زندهٔ تلگرام را تغییر می‌دهد و تست بی‌اثر نیست. محافظت ورود میزبان نباید endpoint عمومی تلگرام را مسدود کند؛ بررسی secret هدر همچنان لازم است. کار درخواست قبل از پاسخ موفق تمام و رسید آپدیت موفق ثبت می‌شود، اما ارسال جزئی مبهم ممکن است در retry تکرار شود.

برای بازگشت برنامه‌ریزی‌شده به polling، مسیر/سرویس webhook را هماهنگ متوقف، ثبت آن را با ابزار موجود حذف و فقط یک poller روشن کنید. ابزارها پیام‌های معلق را دور نمی‌ریزند. `maintenance.py` باید صریحاً زمان‌بندی شود تا رسید/منوی قدیمی جمع شود؛ مخزن خودکار آن را زمان‌بندی نکرده است. تنظیم زبان JSON محلی خودکار به دیتابیس میزبان مهاجرت نمی‌کند.
'''}
