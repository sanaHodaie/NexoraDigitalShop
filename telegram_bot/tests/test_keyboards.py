from api_client import Product
from keyboards import language_kb, main_menu_kb, product_kb, products_list_kb


def _callbacks(kb) -> set:
    return {btn.callback_data for row in kb.inline_keyboard for btn in row}


def test_main_menu_has_all_sections():
    data = _callbacks(main_menu_kb("fa"))
    assert {"menu:products", "menu:search", "menu:compare", "menu:language"} <= data


def test_products_list_kb_links_to_details():
    p = Product(id="1", name="گوشی A", price=100, available=True)
    kb = products_list_kb([p], page=0, page_size=5, lang="fa")
    data = _callbacks(kb)
    assert "prod:1" in data
    assert "back:main" in data


def test_products_list_kb_compare_mode():
    p1 = Product(id="1", name="A", price=100)
    p2 = Product(id="2", name="B", price=200)
    kb = products_list_kb([p1, p2], page=0, page_size=5, lang="fa",
                          compare_mode=True, selected={"1"})
    data = _callbacks(kb)
    assert "cmp:toggle:1" in data and "cmp:toggle:2" in data
    assert "cmp:show" in data and "cmp:clear" in data
    texts = [btn.text for row in kb.inline_keyboard for btn in row]
    assert any(t.startswith("✅") for t in texts)
    assert any(t.startswith("▫️") for t in texts)


def test_products_list_kb_pagination():
    products = [Product(id=str(i), name=f"P{i}", price=i) for i in range(7)]
    kb = products_list_kb(products, page=1, page_size=5, lang="fa")
    data = _callbacks(kb)
    assert "page:0" in data  # دکمه‌ی صفحه‌ی قبل


def test_product_kb_and_language_kb():
    assert "cmp:toggle:9" in _callbacks(product_kb("fa", "9"))
    assert {"lang:fa", "lang:en"} <= _callbacks(language_kb())

def test_long_unicode_product_ids_fit_telegram_callback_limit():
    product = Product(id="محصول" * 30, name="Test")
    for keyboard in [products_list_kb([product], 0, 5, "fa"), product_kb("fa", product.id)]:
        assert all(len(value.encode()) <= 64 for value in _callbacks(keyboard))
