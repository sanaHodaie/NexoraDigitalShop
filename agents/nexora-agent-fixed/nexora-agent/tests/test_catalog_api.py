import httpx
import pytest

from nexora_agent.catalog import ApiCatalog, CatalogError


def backend(handler):
    return httpx.AsyncClient(base_url="http://backend", transport=httpx.MockTransport(handler))


async def test_api_catalog_reads_backend_contract(settings):
    seen = {}

    def handler(request):
        seen["url"] = str(request.url)
        return httpx.Response(200, json=[
            {"id": "x1", "name": "هدفون", "nameEn": "Headphone", "brand": "Sony", "category": "audio",
             "categoryFa": "صوتی", "price": 100.0, "rating": 4.5, "reviewCount": 3, "specs": [], "inStock": False},
        ])

    catalog = ApiCatalog("http://backend", client=backend(handler))
    (product,) = await catalog.all()
    assert seen["url"] == "http://backend/api/products?limit=100"
    assert product.in_stock is False and product.name_en == "Headphone"


async def test_api_catalog_caches_then_reports_outage():
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(200, json=[]) if len(calls) == 1 else httpx.Response(503)

    catalog = ApiCatalog("http://backend", ttl=0, client=backend(handler))
    await catalog.all()
    with pytest.raises(CatalogError):
        await catalog.all()


def test_brand_is_inferred_when_api_has_no_brand_field():
    from nexora_agent.catalog import Product

    p = Product.model_validate(
        {"id": "x", "name": "آیفون", "nameEn": "Apple iPhone 15 Pro", "category": "smartphones", "price": 999}
    )
    assert p.brand == "Apple"
