from aiogram.types import ReplyKeyboardMarkup
from api_client import Product
from keyboards import (
    categories,
    categories_kb,
    language_kb,
    main_menu_kb,
    product_kb,
    products_list_kb,
)
from texts import tr


def labels(kb):
    assert isinstance(kb, ReplyKeyboardMarkup)
    assert kb.resize_keyboard and kb.is_persistent and not kb.one_time_keyboard
    return [b.text for row in kb.keyboard for b in row]


def test_main_menu_is_persistent_bottom_keyboard():
    assert tr('fa', 'btn_products') in labels(main_menu_kb('fa'))
    assert tr('en', 'btn_compare') in labels(main_menu_kb('en'))


def test_categories_come_from_catalogue_and_keep_unknown_categories():
    products = [Product('1', 'Phone', raw={'category': 'smartphones', 'categoryFa': 'گوشی هوشمند'}),
                Product('2', 'Phone2', raw={'category': 'smartphones'}),
                Product('3', 'New', raw={'category': 'new-category', 'categoryFa': 'دستهٔ جدید'})]
    choices = categories(products, 'fa')
    assert len(choices) == 2
    assert any('گوشی هوشمند (2)' in name for name in choices)
    assert set(choices.values()) == {'smartphones', 'new-category'}
    assert set(choices) <= set(labels(categories_kb(choices, 'fa')))


def test_product_names_and_page_controls():
    products = [Product(str(i), f'Phone {i}') for i in range(7)]
    page = labels(products_list_kb(products, 1, 5, 'fa'))
    assert '6. Phone 5' in page and '1. Phone 0' not in page
    assert tr('fa', 'btn_previous') in page
    assert tr('fa', 'btn_next') not in page
    assert tr('fa', 'btn_categories') in page


def test_duplicate_names_are_distinct_and_comparison_is_visible():
    products = [Product('1', 'Same'), Product('2', 'Same')]
    page = labels(products_list_kb(products, 0, 5, 'fa', True, {'1'}))
    assert '✅ 1. Same' in page and '2. Same' in page
    assert tr('fa', 'btn_compare_show') in page


def test_detail_and_language_controls():
    page = labels(product_kb('fa', 'محصول' * 30))
    assert tr('fa', 'btn_add_compare') in page
    assert tr('fa', 'btn_back_products') in page
    assert '🇬🇧 English' in labels(language_kb())


def test_current_store_catalogue_groups_every_product():
    import json
    from pathlib import Path

    from api_client import normalize_product
    data = Path(__file__).resolve().parents[2] / 'backend/data'
    raw = json.loads((data / 'products.json').read_text()) + json.loads((data / 'catalog-products.json').read_text())
    products = [normalize_product(p) for p in raw]
    choices = categories(products, 'fa')
    assert set(choices.values()) == {p['category'] for p in raw}
    assert any('گوشی هوشمند' in label for label in choices)
    assert len(choices) == len({p['category'] for p in raw})


def test_categories_use_two_columns():
    from texts import tr
    choices = {f'Category {i}': str(i) for i in range(5)}
    kb = categories_kb(choices, 'fa')
    rows = [[button.text for button in row] for row in kb.keyboard]
    assert rows[:3] == [['Category 0', 'Category 1'], ['Category 2', 'Category 3'], ['Category 4']]
    assert tr('fa', 'btn_products') in labels(kb)


def test_start_is_inline_below_welcome():
    from keyboards import start_kb
    button = start_kb('fa').inline_keyboard[0][0]
    assert button.text == tr('fa', 'btn_start') and button.callback_data == 'menu:start'
