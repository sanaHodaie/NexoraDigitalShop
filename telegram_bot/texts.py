"""متن‌های ربات در دو زبان فارسی و انگلیسی."""

TEXTS = {
    "fa": {
        "welcome": "سلام {name} عزیز! 👋\nبه میز ارتباط با مشتریان نکسورا خوش آمدید.\nبرای خرید عمده، پشتیبانی و پیگیری درخواست، دکمهٔ شروع را بزنید:",
        "main_menu": "منوی اصلی — یکی از گزینه‌ها را انتخاب کنید:",
        "btn_products": "🗂 دسته‌بندی محصولات",
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
                "🗂 دسته‌بندی محصولات — دسته، سپس نام محصول را از منوی پایین انتخاب کنید\n"
                "🔍 جست‌وجو — جست‌وجوی محصول بر اساس نام\n"
                "⚖️ مقایسه — مقایسه‌ی ۲ یا چند محصول\n"
                "🌐 زبان — تغییر زبان (فارسی/English)\n\n"
                "/ping — بررسی اتصال به بک‌اند فروشگاه\n"
                "/cancel — لغو عملیات جاری و بازگشت به منو",
    },
    "en": {
        "welcome": "Hello {name}! 👋\nWelcome to Nexora customer care.\nTap Start for wholesale enquiries, support and tracking:",
        "main_menu": "Main menu — please choose an option:",
        "btn_products": "🗂 Product categories",
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
                "🗂 Product categories — choose a category, then a product from the bottom menu\n"
                "🔍 Search — find a product by name\n"
                "⚖️ Compare — compare 2 or more products\n"
                "🌐 Language — switch language (فارسی/English)\n\n"
                "/ping — check shop backend connection\n"
                "/cancel — cancel current action and return to the menu",
    },
}

TEXTS["fa"].update({
    "btn_start": "▶️ شروع",
    "btn_categories": "🗂 بازگشت به دسته‌بندی‌ها", "btn_previous": "◀️ صفحهٔ قبل",
    "btn_next": "صفحهٔ بعد ▶️", "categories_title": "دسته‌بندی محصولات فروشگاه؛ از منوی پایین انتخاب کنید:",
    "page_label": "صفحهٔ {page} از {pages}", "label_specs": "مشخصات فنی",
    "label_original_price": "قیمت قبل از تخفیف", "label_discount": "تخفیف", "label_reviews": "تعداد نظرها",
    "label_category": "دسته‌بندی", "label_brand": "برند", "label_rating": "امتیاز",
    "compare_limit": "حداکثر سه محصول را می‌توانید مقایسه کنید.",
    "compare_category": "برای مقایسه، محصولات یک دسته را انتخاب کنید.",
    "selection_expired": "منوی قبلی دیگر فعال نیست؛ دوباره دسته‌بندی را انتخاب کنید.",
    "choose_compare_category": "برای انتخاب محصولات مقایسه، ابتدا دسته‌بندی را از پایین انتخاب کنید.",
    "compare_empty": "ابتدا از دسته‌بندی‌ها محصولی انتخاب و به مقایسه اضافه کنید.",
})
TEXTS["en"].update({
    "btn_start": "▶️ Start",
    "btn_categories": "🗂 Back to categories", "btn_previous": "◀️ Previous page",
    "btn_next": "Next page ▶️", "categories_title": "Choose a product category from the bottom menu:",
    "page_label": "Page {page} of {pages}", "label_specs": "Specifications",
    "label_original_price": "Original price", "label_discount": "Discount", "label_reviews": "Reviews",
    "label_category": "Category", "label_brand": "Brand", "label_rating": "Rating",
    "compare_limit": "You can compare up to three products.",
    "compare_category": "Choose products from the same category for comparison.",
    "selection_expired": "That menu is no longer active. Please choose a category again.",
    "choose_compare_category": "First choose a category below to select products for comparison.",
    "compare_empty": "Choose a product from the categories and add it to comparison first.",
})

DEFAULT_LANG = "fa"


def tr(lang: str, key: str) -> str:
    """متن موردنظر را در زبان خواسته‌شده برمی‌گرداند (پیش‌فرض: فارسی)."""
    return TEXTS.get(lang, TEXTS[DEFAULT_LANG]).get(key, key)
TEXTS['fa']['help'] = ('📖 راهنمای ارتباط با مشتریان نکسورا\n\n📦 درخواست خرید عمده — ثبت اقلام، تعداد و نشانی برای بررسی تیم فروش\n💬 درخواست پشتیبانی — ثبت موضوع و اطلاعات تماس\n❓ سؤالات متداول — خرید عمده، قیمت، ارسال و پیگیری\n📋 پیگیری درخواست‌ها — مشاهدهٔ وضعیت درخواست‌های همین حساب تلگرام\n\nثبت فرم، خرید قطعی نیست؛ قیمت و شرایط باید توسط تیم فروش تأیید شوند.\n/cancel — کنار گذاشتن فرم\n/ping — بررسی اتصال سرور')
TEXTS['en']['help'] = ('📖 Nexora customer care\n\n📦 Wholesale enquiry — products, quantities and destination for sales review\n💬 Support request — describe your issue\n❓ FAQ — pricing, shipping and tracking\n📋 My requests — status for this Telegram account\n\nAn enquiry is not a confirmed purchase. Sales must confirm pricing and terms.\n/cancel — leave the form\n/ping — check server connectivity')
