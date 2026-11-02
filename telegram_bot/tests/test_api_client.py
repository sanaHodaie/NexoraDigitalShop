from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from api_client import (ApiDataError, ApiHttpError, ApiNetworkError,
                        NexoraClient, Product, normalize_product)


def _resp(payload, status=200):
    r = MagicMock()
    r.status_code = status
    r.json.return_value = payload
    if status == 200:
        r.raise_for_status = MagicMock()
    else:
        r.raise_for_status = MagicMock(
            side_effect=httpx.HTTPStatusError("err", request=MagicMock(),
                                              response=MagicMock())
        )
    return r


def test_normalize_product_with_common_keys():
    p = normalize_product({
        "product_id": "7", "title": "گوشی سامسونگ", "price": 25000000,
        "in_stock": True, "image_url": "https://example.com/img.jpg",
        "desc": "تست توضیحات",
    })
    assert p is not None
    assert p.id == "7"
    assert p.name == "گوشی سامسونگ"
    assert p.price == 25000000
    assert p.available is True
    assert p.image == "https://example.com/img.jpg"


def test_normalize_product_nexora_real_shape():
    """ساختار واقعی بک‌اند Nexora: inStock boolean، بدون فیeld stock."""
    p = normalize_product({
        "id": "trend-1",
        "name": "اپل آیفون ۱۵ پرو",
        "nameEn": "Apple iPhone 15 Pro",
        "category": "smartphones",
        "price": 999,
        "inStock": True,
        "image": "/assets/hero_devices_showcase.jpg",
        "description": "تست توضیحات",
    })
    assert p is not None
    assert p.id == "trend-1"
    assert p.name == "اپل آیفون ۱۵ پرو"
    assert p.price == 999
    assert p.available is True
    assert p.stock is None  # بک‌اند stock ارسال نمی‌کند
    assert p.image == "/assets/hero_devices_showcase.jpg"


def test_normalize_product_nexora_out_of_stock():
    p = normalize_product({
        "id": "x1", "name": "محصول ناموجود", "price": 100, "inStock": False,
    })
    assert p is not None
    assert p.available is False
    assert p.stock is None


def test_normalize_product_with_original_price():
    p = normalize_product({
        "id": "d1", "name": "تست", "price": 500, "originalPrice": 700,
        "inStock": True,
    })
    assert p.price == 500  # قیمت نهایی اولویت دارد


def test_normalize_product_stock_number():
    p = normalize_product({"id": 1, "name": "A", "stock": 3})
    assert p.available is True and p.stock == 3
    p2 = normalize_product({"id": 2, "name": "B", "stock": 0})
    assert p2.available is False


def test_normalize_product_unrecognized_returns_none():
    assert normalize_product({"foo": "bar"}) is None
    assert normalize_product("not a dict") is None


async def test_get_products_plain_list():
    with patch.object(httpx.AsyncClient, "get",
                      new=AsyncMock(return_value=_resp([{"id": 1, "name": "A", "price": 10}]))):
        c = NexoraClient("http://localhost:8000")
        products = await c.get_products()
        await c.aclose()
    assert len(products) == 1
    assert products[0].name == "A"


async def test_get_products_with_query_and_category_params():
    """verify that q and category are forwarded as query params to the API."""
    captured: dict = {}

    async def fake_get(self, url, params=None, **kwargs):
        captured["url"] = url
        captured["params"] = params
        return _resp([{"id": 1, "name": "A", "price": 10}])

    with patch.object(httpx.AsyncClient, "get", new=fake_get):
        c = NexoraClient("http://localhost:8000")
        products = await c.get_products(query="گوشی", category="smartphones")
        await c.aclose()
    assert captured["url"] == "/api/products"
    assert captured["params"] == {"q": "گوشی", "category": "smartphones"}
    assert len(products) == 1


async def test_get_products_wrapped_dict():
    with patch.object(httpx.AsyncClient, "get",
                      new=AsyncMock(return_value=_resp({"items": [{"id": 2, "name": "B", "price": 5}]}))):
        c = NexoraClient("http://localhost:8000")
        products = await c.get_products()
        await c.aclose()
    assert len(products) == 1


async def test_network_error_raises_api_network_error():
    with patch.object(httpx.AsyncClient, "get",
                      new=AsyncMock(side_effect=httpx.ConnectError("boom"))):
        c = NexoraClient("http://localhost:8000")
        with pytest.raises(ApiNetworkError):
            await c.get_products()
        await c.aclose()


async def test_http_error_raises_api_http_error():
    with patch.object(httpx.AsyncClient, "get",
                      new=AsyncMock(return_value=_resp([], status=500))):
        c = NexoraClient("http://localhost:8000")
        with pytest.raises(ApiHttpError) as info:
            await c.get_products()
        await c.aclose()
    assert info.value.status_code == 500


async def test_invalid_json_raises_api_data_error():
    resp = _resp(None)
    resp.json = MagicMock(side_effect=ValueError("bad json"))
    with patch.object(httpx.AsyncClient, "get", new=AsyncMock(return_value=resp)):
        c = NexoraClient("http://localhost:8000")
        with pytest.raises(ApiDataError):
            await c.get_products()
        await c.aclose()


async def test_get_product_returns_none_without_detail_path():
    c = NexoraClient("http://localhost:8000", product_detail_path="")
    assert await c.get_product("1", cached=[]) is None
    await c.aclose()


async def test_get_product_falls_back_to_cache():
    """when no detail path is configured, get_product searches the cached list."""
    cached = [Product(id="abc", name="Cached Item", price=10, available=True)]
    c = NexoraClient("http://localhost:8000", product_detail_path="")
    result = await c.get_product("abc", cached=cached)
    await c.aclose()
    assert result is not None
    assert result.id == "abc"
    assert result.name == "Cached Item"


async def test_get_product_returns_none_when_not_found():
    c = NexoraClient("http://localhost:8000", product_detail_path="")
    assert await c.get_product("missing", cached=[]) is None
    await c.aclose()


async def test_health_false_on_network_error():
    with patch.object(httpx.AsyncClient, "get",
                      new=AsyncMock(side_effect=httpx.ConnectError("boom"))):
        c = NexoraClient("http://localhost:8000")
        assert await c.health() is False
        await c.aclose()

async def test_unrecognized_json_is_not_an_empty_catalogue():
    with patch.object(httpx.AsyncClient, "get", new=AsyncMock(return_value=_resp({"error": "invalid"}))):
        c = NexoraClient("http://localhost:8000")
        try:
            with pytest.raises(ApiDataError):
                await c.get_products()
        finally:
            await c.aclose()


async def test_confirmation_service_key_and_backend_success_required():
    with patch.object(httpx.AsyncClient, "post", new=AsyncMock(return_value=_resp({"linked": False}))) as post:
        c = NexoraClient("http://localhost:8000", telegram_bot_api_key="test-key")
        try:
            with pytest.raises(ApiDataError):
                await c.complete_telegram_direct_link("a" * 43, 123)
            assert post.call_args.kwargs["headers"]["X-Telegram-Bot-Key"] == "test-key"
            assert post.call_args.kwargs["json"]["telegram_user_id"] == 123
        finally:
            await c.aclose()
