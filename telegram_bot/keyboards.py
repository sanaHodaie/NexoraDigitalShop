"""صفحه‌کلیدهای درون‌خطی ربات."""
from hashlib import sha256

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from api_client import Product
from texts import tr


def callback_id(product_id):
    # Telegram limits callback_data to 64 UTF-8 bytes (including the action prefix).
    if len(product_id.encode()) <= 48 and not product_id.startswith("~"):
        return product_id
    return "~" + sha256(product_id.encode()).hexdigest()[:32]


def main_menu_kb(lang: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text=tr(lang, "btn_products"), callback_data="menu:products")
    kb.button(text=tr(lang, "btn_search"), callback_data="menu:search")
    kb.button(text=tr(lang, "btn_compare"), callback_data="menu:compare")
    kb.button(text=tr(lang, "btn_language"), callback_data="menu:language")
    kb.adjust(2, 1, 1)
    return kb.as_markup()


def products_list_kb(products: list[Product], page: int, page_size: int,
                     lang: str, compare_mode: bool = False,
                     selected: set | None = None) -> InlineKeyboardMarkup:
    """فهرست محصولات با صفحه‌بندی؛ در حالت مقایسه، دکمه‌ها انتخابی می‌شوند."""
    kb = InlineKeyboardBuilder()
    selected = selected or set()

    for p in products[page * page_size:(page + 1) * page_size]:
        label = (p.name or str(p.id))[:40]
        if compare_mode:
            mark = "✅ " if p.id in selected else "▫️ "
            cb = f"cmp:toggle:{callback_id(p.id)}"
        else:
            cb = f"prod:{callback_id(p.id)}"
        kb.button(text=mark + label if compare_mode else label, callback_data=cb)

    total = len(products)
    pages = max(1, (total + page_size - 1) // page_size)
    if pages > 1:
        row = []
        if page > 0:
            row.append(InlineKeyboardButton(text="◀️", callback_data=f"page:{page - 1}"))
        row.append(InlineKeyboardButton(text=f"{page + 1}/{pages}", callback_data="noop"))
        if page < pages - 1:
            row.append(InlineKeyboardButton(text="▶️", callback_data=f"page:{page + 1}"))
        kb.row(*row)

    if compare_mode:
        kb.button(text=tr(lang, "btn_compare_show"), callback_data="cmp:show")
        kb.button(text=tr(lang, "btn_compare_clear"), callback_data="cmp:clear")
    kb.button(text=tr(lang, "btn_back_main"), callback_data="back:main")
    kb.adjust(1)
    return kb.as_markup()


def product_kb(lang: str, product_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text=tr(lang, "btn_add_compare"), callback_data=f"cmp:toggle:{callback_id(product_id)}")
    kb.button(text=tr(lang, "btn_back_products"), callback_data="menu:products")
    kb.button(text=tr(lang, "btn_back_main"), callback_data="back:main")
    kb.adjust(1)
    return kb.as_markup()


def language_kb() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🇮🇷 فارسی", callback_data="lang:fa")
    kb.button(text="🇬🇧 English", callback_data="lang:en")
    kb.button(text=tr("fa", "btn_back_main"), callback_data="back:main")
    kb.adjust(2, 1)
    return kb.as_markup()