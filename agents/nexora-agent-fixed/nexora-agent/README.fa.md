# دستیار خرید نکسورا (Nexora Agent)

ایجنت پایتونی که به مشتری کمک می‌کند محصول پیدا و مقایسه کند و به پرسش‌های ساده‌ی ارسال و خرید جواب دهد. با همان استک بک‌اند سایت (Python، FastAPI، Pydantic 2) نوشته شده و **جدا از سایت** قابل اجرا و تست است.

## ساختار

```text
nexora_agent/
  agent.py      حلقه‌ی ایجنت (مدل ← ابزار ← مدل)، stateless
  tools.py      ۶ ابزار: جست‌وجو، جزئیات، مقایسه، دسته‌ها، قوانین فروشگاه، پیشنهاد افزودن به سبد
  catalog.py    خواندن کاتالوگ از فایل JSON یا از API واقعی سایت + فیلتر محلی
  llm.py        اتصال به Anthropic (پشت یک Protocol، قابل تعویض)
  prompts.py    پرامپت سیستمی فارسی
  server.py     make_router() برای merge + create_app() برای اجرای مستقل
  cli.py        چت ترمینالی برای تست دستی
frontend/AssistantWidget.jsx   ویجت چت با ظاهر سایت (Tailwind، دارک مود، RTL)
data/catalog-products.json     کپی کاتالوگ سایت برای تست بدون بک‌اند
tests/                          ۳۶ تست
```

## اجرا

```sh
cp .env.example .env          # ANTHROPIC_API_KEY را پر کنید
uv sync                       # یا: pip install -e . pytest pytest-asyncio
uv run pytest                 # تست‌ها (بدون نیاز به API key)
uv run python -m nexora_agent.cli                                  # چت ترمینالی
uv run uvicorn nexora_agent.server:build --factory --port 8001     # سرور: POST /api/assistant/chat
```

برای تست با فرانت سایت قبل از merge، در `vite.config` خط پراکسی `'/api/assistant'` را به `http://127.0.0.1:8001` **قبل از** `'/api'` اضافه کنید.

حالت `CATALOG_SOURCE=api` کاتالوگ زنده (قیمت و موجودی) را از بک‌اند می‌خواند.

## استفاده‌ی رایگان (بدون API پولی)

با `LLM_PROVIDER=openai` هر سرویس سازگار با OpenAI کار می‌کند؛ نمونه‌ها داخل `.env.example` هست: Ollama (روی کامپیوتر خودتان)، Gemini، Groq. مدل باید «tool calling» پشتیبانی کند. مدل‌های کوچک محلی در فارسی و استفاده از ابزار ضعیف‌ترند. نام مدل‌ها و سقف رایگان را در مستندات هر سرویس چک کنید چون عوض می‌شود.

## تصمیم‌های طراحی (مطابق سایت)

- **قیمت‌ها** مثل `formatPrice` سایت: ضرب در ۶۰۰٬۰۰۰، ارقام فارسی، «ریال». مدل هرگز قیمت را خودش حساب نمی‌کند؛ متن آماده از ابزار می‌گیرد.
- **ایجنت سبد را تغییر نمی‌دهد.** `suggest_add_to_cart` فقط یک «اقدام پیشنهادی» برمی‌گرداند و مرورگر با `addToCart` خود سایت (با session و CSRF خود کاربر، چک موجودی و ورود) اجرایش می‌کند. ایجنت هیچ credential ای ندارد.
- **Stateless**: تاریخچه را کلاینت نگه می‌دارد؛ چیزی ذخیره نمی‌شود و متن پیام‌ها لاگ نمی‌شود.
- **امنیت**: خروجی ابزارها «داده» تلقی می‌شود (ضد prompt-injection)، نقش‌های جعلی در تاریخچه حذف می‌شود، حلقه‌ی ابزار سقف دارد، آرگومان‌های خراب مدل کرش نمی‌کنند، rate limit دارد.
- **قرارداد خطا** همان بک‌اند: `{"error": "...", "code": "..."}`.
- فیلتر برند/قیمت/موجودی سمت ایجنت انجام می‌شود چون جست‌وجوی بک‌اند فقط روی نام محصول است.

## Merge با سایت

1. پوشه‌ی `nexora_agent/` را به `backend/` کپی کنید و `anthropic` و `httpx` را به `pyproject.toml` بک‌اند اضافه کنید.
2. در `backend/app/main.py` (کنار `include_router`های موجود):
   ```python
   from nexora_agent.config import Settings as AgentSettings
   from nexora_agent.server import make_router
   # get_agent: Agent(AnthropicLLM(...), make_catalog(cfg), cfg) را یک‌بار بسازید و برگردانید
   app.include_router(make_router(AgentSettings(), get_agent))
   ```
   CSRF و هدرهای امنیتی بک‌اند خودکار روی این مسیر هم اعمال می‌شود. حتماً `limiter` (لیمیتر Redis بک‌اند؛ امضای `allow(key, limit, seconds)`) و `key_func` (تابعی که IP واقعی کاربر را برمی‌گرداند، چون پشت Vercel/Render مقدار `request.client.host` آی‌پی پراکسی است و همه‌ی کاربران یک سطل مشترک می‌شوند) را به `make_router` بدهید و `CATALOG_SOURCE=api` بگذارید. `DAILY_REQUEST_CAP` سقف روزانه‌ی کل درخواست‌ها برای محافظت از هزینه‌ی API است.
3. فرانت: `AssistantWidget.jsx` را در `src/components/Assistant/` بگذارید و در `App.jsx` کنار `<ToastContainer />` رندر کنید. مسیر `/api/assistant` از قبل داخل پراکسی `/api` در `vercel.json` و Vite پوشش داده می‌شود.
4. `ANTHROPIC_API_KEY` را فقط روی بک‌اند تنظیم کنید (هرگز با پیشوند `VITE_`).

## چه چیزی تست شده و چه چیزی نه

تست‌شده (۳۶ تست): منطق ابزارها، فرمت قیمت، فیلترها، حلقه‌ی ایجنت با مدل جعلی، سقف حلقه، پاک‌سازی تاریخچه، قرارداد HTTP و خطاها، rate limit، mount شدن router در یک اپ دیگر، خواندن قرارداد `/api/products`، و تبدیل پاسخ‌های SDK آنتروپیک (با سرور HTTP جعلی). ویجت با esbuild کامپایل می‌شود.

**تست نشده**: کیفیت واقعی پاسخ‌های مدل (در محیط ساخت API key نبود)، اجرای ویجت در مرورگر، و اتصال به بک‌اند زنده. قبل از merge چند مکالمه‌ی واقعی با CLI امتحان کنید.

## نکته‌ها

- `get_shop_policies` فعلاً «پرداخت آنلاین فعال نیست» را ثابت برمی‌گرداند (طبق متن `AccountPage.jsx`). وقتی درگاه فعال شد در `tools.py` عوض کنید.
- قیمت‌های کاتالوگ فعلی نمونه (`demo`) هستند و ایجنت در صورت پرسش خرید واقعی این را می‌گوید.
- نام مدل با `AGENT_MODEL` تنظیم می‌شود؛ برای هزینه‌ی کمتر می‌توانید مدل سبک‌تر بگذارید.
