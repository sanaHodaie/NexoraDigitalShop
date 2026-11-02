"""متن‌های ربات در دو زبان فارسی و انگلیسی."""

TEXTS = {
    "fa": {
        "welcome": "سلام {name} عزیز! 👋\nبه ربات فروشگاه Nexora خوش آمدید.\nاز منوی زیر انتخاب کنید:",
        "main_menu": "منوی اصلی — یکی از گزینه‌ها را انتخاب کنید:",
        "btn_products": "🛍 محصولات",
        "btn_search": "🔍 جست‌وجو",
        "btn_compare": "⚖️ مقایسه",
        "btn_language": "🌐 زبان / Language",
        "btn_back_main": "🏠 بازگشت به منوی اصلی",
        "btn_back_products": "↩️ بازگشت به محصولات",
        "btn_compare_show": "⚖️ نمایش مقایسه",
        "btn_compare_clear": "🧹 پاک‌کردن انتخاب‌ها",
        "btn_add_compare": "➕ افزودن به مقایسه",
        "products_title": "🛍 فهرست محصولات ({count} مورد):",
        "products_empty": "در حال حاضر محصولی برای نمایش وجود ندارد.",
        "search_prompt": "🔍 نام محصولی که می‌خواهید را بنویسید (حداقل ۲ حرف):",
        "search_short": "عبارت جست‌وجو خیلی کوتاه است؛ حداقل ۲ حرف وارد کنید.",
        "search_result": "🔍 نتیجه‌ی جست‌وجوی «{q}» ({count} مورد):",
        "search_empty": "نتیجه‌ای برای «{q}» پیدا نشد.",
        "product_not_found": "این محصول پیدا نشد؛ ممکن است حذف شده باشد.",
        "label_price": "💰 قیمت",
        "label_availability": "📦 موجودی",
        "label_description": "📝 توضیحات",
        "in_stock": "موجود ✅",
        "in_stock_count": "موجود ✅ ({count} عدد)",
        "out_of_stock": "ناموجود ❌",
        "stock_unknown": "نامشخص",
        "compare_hint": "⚖️ حالت مقایسه:\nروی محصولات بزنید تا انتخاب شوند (حداقل ۲ محصول)، سپس «نمایش مقایسه» را بزنید.",
        "compare_title": "⚖️ مقایسه محصولات:",
        "compare_need_two": "برای مقایسه حداقل ۲ محصول انتخاب کنید.",
        "compare_added": "به مقایسه اضافه شد ✅",
        "compare_removed": "از مقایسه حذف شد ❌",
        "choose_language": "🌐 زبان خود را انتخاب کنید / Choose your language:",
        "lang_set": "زبان روی فارسی تنظیم شد. ✅",
        "backend_ok": "✅ اتصال به بک‌اند فروشگاه برقرار است.",
        "backend_fail": "❌ بک‌اند فروشگاه در دسترس نیست. مطمئن شوید با دستور «uv run python start.py» داخل پوشه‌ی backend اجرا شده است.",
        "err_network": "⚠️ اتصال به بک‌اند فروشگاه برقرار نشد. لطفاً بعداً تلاش کنید یا با /ping وضعیت را بررسی کنید.",
        "err_http": "⚠️ بک‌اند فروشگاه خطای {status} برگرداند. لطفاً بعداً تلاش کنید.",
        "err_data": "⚠️ پاسخ بک‌اند فروشگاه قابل خواندن نبود؛ ساختار API احتمالاً تغییر کرده است.",
        "err_generic": "⚠️ خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.",
        "unknown_input": "برای شروع از منوی زیر استفاده کنید:",
        "help": "📖 راهنمای ربات فروشگاه Nexora:\n\n"
                "🛍 محصولات — فهرست محصولات واقعی فروشگاه\n"
                "🔍 جست‌وجو — جست‌وجوی محصول بر اساس نام\n"
                "⚖️ مقایسه — مقایسه‌ی ۲ یا چند محصول\n"
                "🌐 زبان — تغییر زبان (فارسی/English)\n\n"
                "/ping — بررسی اتصال به بک‌اند فروشگاه\n"
                "/cancel — لغو عملیات جاری و بازگشت به منو",
    },
    "en": {
        "welcome": "Hello {name}! 👋\nWelcome to the Nexora shop bot.\nChoose an option from the menu below:",
        "main_menu": "Main menu — please choose an option:",
        "btn_products": "🛍 Products",
        "btn_search": "🔍 Search",
        "btn_compare": "⚖️ Compare",
        "btn_language": "🌐 زبان / Language",
        "btn_back_main": "🏠 Back to main menu",
        "btn_back_products": "↩️ Back to products",
        "btn_compare_show": "⚖️ Show comparison",
        "btn_compare_clear": "🧹 Clear selection",
        "btn_add_compare": "➕ Add to comparison",
        "products_title": "🛍 Product list ({count} items):",
        "products_empty": "There are no products to show right now.",
        "search_prompt": "🔍 Type the product name you are looking for (at least 2 characters):",
        "search_short": "The search term is too short; enter at least 2 characters.",
        "search_result": "🔍 Results for “{q}” ({count} items):",
        "search_empty": "No results found for “{q}”.",
        "product_not_found": "This product could not be found; it may have been removed.",
        "label_price": "💰 Price",
        "label_availability": "📦 Availability",
        "label_description": "📝 Description",
        "in_stock": "In stock ✅",
        "in_stock_count": "In stock ✅ ({count} available)",
        "out_of_stock": "Out of stock ❌",
        "stock_unknown": "Unknown",
        "compare_hint": "⚖️ Comparison mode:\nTap products to select them (at least 2), then tap “Show comparison”.",
        "compare_title": "⚖️ Product comparison:",
        "compare_need_two": "Please select at least 2 products to compare.",
        "compare_added": "Added to comparison ✅",
        "compare_removed": "Removed from comparison ❌",
        "choose_language": "🌐 زبان خود را انتخاب کنید / Choose your language:",
        "lang_set": "Language set to English. ✅",
        "backend_ok": "✅ Connection to the shop backend is working.",
        "backend_fail": "❌ The shop backend is unreachable. Make sure it is running with “uv run python start.py” inside the backend folder.",
        "err_network": "⚠️ Could not connect to the shop backend. Please try again later or check with /ping.",
        "err_http": "⚠️ The shop backend returned error {status}. Please try again later.",
        "err_data": "⚠️ The backend response could not be parsed; the API structure may have changed.",
        "err_generic": "⚠️ An unexpected error occurred. Please try again.",
        "unknown_input": "Use the menu below to get started:",
        "help": "📖 Nexora shop bot guide:\n\n"
                "🛍 Products — list of real shop products\n"
                "🔍 Search — find a product by name\n"
                "⚖️ Compare — compare 2 or more products\n"
                "🌐 Language — switch language (فارسی/English)\n\n"
                "/ping — check shop backend connection\n"
                "/cancel — cancel current action and return to the menu",
    },
}

DEFAULT_LANG = "fa"


def tr(lang: str, key: str) -> str:
    """متن موردنظر را در زبان خواسته‌شده برمی‌گرداند (پیش‌فرض: فارسی)."""
    return TEXTS.get(lang, TEXTS[DEFAULT_LANG]).get(key, key)