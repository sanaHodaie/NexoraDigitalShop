"""Persistent bottom keyboards for category → product navigation."""
from hashlib import sha256

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)
from api_client import Product
from texts import tr


def callback_id(product_id):
    # Retained for buttons in messages sent by older releases.
    if len(product_id.encode()) <= 48 and not product_id.startswith("~"):
        return product_id
    return "~" + sha256(product_id.encode()).hexdigest()[:32]


def keyboard(rows):
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=text) for text in row] for row in rows],
        resize_keyboard=True, is_persistent=True, one_time_keyboard=False,
    )


def start_kb(lang):
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=tr(lang, "btn_start"), callback_data="menu:start")
    ]])


def menu_rows(lang):
    return [[tr(lang, 'btn_products'), tr(lang, 'btn_search')],
            [tr(lang, 'btn_compare'), tr(lang, 'btn_language')]]


def main_menu_kb(lang):
    return keyboard(menu_rows(lang))


def category_name(product, lang):
    raw = product.raw
    category = str(raw.get('category') or 'other')
    names = {
        'smartphones': ('گوشی هوشمند', 'Smartphones'),
        'laptops': ('لپ‌تاپ و پی‌سی', 'Laptops and PCs'), 'audio': ('تجهیزات صوتی', 'Audio'),
        'accessories': ('لوازم جانبی', 'Accessories'),
        'gaming': ('گیمینگ و کنسول', 'Gaming'), 'wearables': ('پوشیدنی‌ها', 'Wearables'),
        'drones': ('پهپاد و کوادکوپتر', 'Drones'),
        'smart-home': ('خانه هوشمند', 'Smart home'), 'cameras': ('دوربین و لنز', 'Cameras'),
        'more': ('سایر دسته‌ها', 'More categories'), 'other': ('سایر محصولات', 'Other products'),
    }
    fallback = names.get(category, (category, category))[lang == 'en']
    if category in names:
        return fallback
    return str(raw.get('categoryFa') or fallback) if lang == 'fa' else fallback


def categories(products, lang):
    grouped = {}
    for product in products:
        key = str(product.raw.get('category') or 'other')
        if key not in grouped:
            grouped[key] = [category_name(product, lang), 0]
        grouped[key][1] += 1
    choices = {}
    for key, (name, count) in sorted(grouped.items()):
        label = f"📂 {name} ({count})"
        if label in choices:
            label += f" · {key}"
        choices[label] = key
    return choices


def categories_kb(choices, lang):
    labels = list(choices)
    return keyboard([labels[i:i + 2] for i in range(0, len(labels), 2)] + menu_rows(lang))


def product_label(product, index, selected=None):
    mark = '✅ ' if selected and product.id in selected else ''
    return f'{mark}{index + 1}. {product.name}'


def products_list_kb(products: list[Product], page: int, page_size: int,
                     lang: str, compare_mode: bool = False,
                     selected: set | None = None):
    rows = [[product_label(p, index, selected)]
            for index, p in enumerate(products)
            if page * page_size <= index < (page + 1) * page_size]
    pages = max(1, (len(products) + page_size - 1) // page_size)
    arrows = []
    if page > 0:
        arrows.append(tr(lang, 'btn_previous'))
    if page + 1 < pages:
        arrows.append(tr(lang, 'btn_next'))
    if arrows:
        rows.append(arrows)
    rows += [[tr(lang, 'btn_compare_show'), tr(lang, 'btn_compare_clear')],
             [tr(lang, 'btn_categories'), tr(lang, 'btn_back_main')]]
    return keyboard(rows)


def product_kb(lang: str, product_id: str):
    return keyboard([[tr(lang, 'btn_add_compare'), tr(lang, 'btn_compare_show')],
                     [tr(lang, 'btn_back_products'), tr(lang, 'btn_categories')],
                     [tr(lang, 'btn_back_main')]])


def language_kb():
    return keyboard([['🇮🇷 فارسی', '🇬🇧 English'], [tr('fa', 'btn_back_main')]])
