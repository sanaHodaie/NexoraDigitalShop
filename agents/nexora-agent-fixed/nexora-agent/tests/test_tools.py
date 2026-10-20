from nexora_agent.tools import ToolRunner


async def run(catalog, settings, name, **args):
    runner = ToolRunner(catalog, settings)
    return runner, *await runner.run(name, args)


async def test_price_text_matches_storefront_format(catalog, settings):
    _, result, err = await run(catalog, settings, "get_product", product_id="phone-01")
    assert not err
    assert result["price"] == "۴۷۹,۴۰۰,۰۰۰ ریال"  # 799 * 600000, Persian digits like formatPrice()
    assert result["rating"] is None  # reviewCount == 0 -> unrated, not "0 stars"


async def test_search_filters_brand_and_rial_budget(catalog, settings):
    _, result, _ = await run(
        catalog, settings, "search_products", brand="apple", category="smartphones",
        max_price_rial=450_000_000, sort="price_asc",
    )
    prices = [p["price"] for p in result["products"]]
    assert result["total_matches"] >= 1 and all(p["brand"] == "Apple" for p in result["products"])
    assert all(float(p["price"].replace("ریال", "").replace(",", "").translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))) <= 450_000_000 for p in result["products"]), prices


async def test_search_limit_is_clamped(catalog, settings):
    _, result, _ = await run(catalog, settings, "search_products", limit=999)
    assert result["returned"] == 8


async def test_persian_text_query(catalog, settings):
    _, result, _ = await run(catalog, settings, "search_products", query="آیفون")
    assert result["total_matches"] > 0


async def test_bad_argument_types_do_not_crash(catalog, settings):
    _, result, err = await run(catalog, settings, "search_products", query=123, limit="x", sort={"a": 1}, min_price_rial="9")
    assert not err and "products" in result


async def test_unknown_tool_and_missing_product(catalog, settings):
    assert (await run(catalog, settings, "delete_everything"))[2] is True
    assert (await run(catalog, settings, "get_product", product_id="nope"))[2] is True


async def test_compare_requires_two_to_four(catalog, settings):
    assert (await run(catalog, settings, "compare_products", product_ids=["phone-01"]))[2] is True
    _, result, err = await run(catalog, settings, "compare_products", product_ids=["phone-01", "phone-02", "ghost"])
    assert not err and len(result["products"]) == 2 and result["not_found"] == ["ghost"]


async def test_categories(catalog, settings):
    _, result, _ = await run(catalog, settings, "list_categories")
    assert {c["id"] for c in result["categories"]} == {"smartphones", "laptops", "audio", "gaming", "smart-home"}


async def test_add_to_cart_is_only_a_proposal_and_deduped(catalog, settings):
    runner = ToolRunner(catalog, settings)
    await runner.run("suggest_add_to_cart", {"product_id": "phone-01", "quantity": 500})
    await runner.run("suggest_add_to_cart", {"product_id": "phone-01"})
    assert runner.actions == [{"type": "add_to_cart", "productId": "phone-01", "productName": "اپل آیفون ۱۵", "quantity": 10}]


async def test_out_of_stock_cannot_be_suggested(catalog, settings):
    (await catalog.get("phone-01")).in_stock = False
    _, result, err = await run(catalog, settings, "suggest_add_to_cart", product_id="phone-01")
    assert err and result["error"] == "out_of_stock"


async def test_policies_match_backend_rules(catalog, settings):
    _, result, _ = await run(catalog, settings, "get_shop_policies")
    assert result["free_shipping_from"] == "۵۹,۴۰۰,۰۰۰ ریال"  # 99 * 600000
    assert result["shipping_fee_below_threshold"] == "۵,۹۹۴,۰۰۰ ریال"  # 9.99 * 600000
