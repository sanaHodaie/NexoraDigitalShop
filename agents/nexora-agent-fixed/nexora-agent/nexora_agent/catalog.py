"""Catalogue access. One code path for search/filter regardless of the source.

The backend only searches product names, so the agent fetches the (small)
catalogue once, caches it briefly and filters locally. If the catalogue ever
grows beyond the API's 100-item limit, add a paginated endpoint on the backend.
"""

import json
import time
from pathlib import Path
from typing import Protocol

import httpx
from pydantic import BaseModel, ConfigDict, Field, model_validator

from nexora_agent.config import Settings


class Product(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: str
    name: str
    name_en: str = Field(default="", alias="nameEn")
    brand: str = ""
    category: str
    category_fa: str = Field(default="", alias="categoryFa")
    price: float
    rating: float = 0
    review_count: int = Field(default=0, alias="reviewCount")
    specs: list[str] = Field(default_factory=list)
    description: str = ""
    in_stock: bool = Field(default=True, alias="inStock")
    demo: bool = False

    @model_validator(mode="after")
    def _infer_brand(self):
        # The real /api/products has no "brand" field; the English name starts with it ("Apple iPhone 15").
        if not self.brand and self.name_en:
            self.brand = self.name_en.split()[0]
        return self

    def haystack(self) -> str:
        parts = [self.name, self.name_en, self.brand, self.category, self.category_fa, *self.specs]
        return " ".join(parts).casefold()


class CatalogError(Exception):
    pass


class Catalog(Protocol):
    async def all(self) -> list[Product]: ...
    async def get(self, product_id: str) -> Product | None: ...


class _Cached:
    def __init__(self, ttl: int):
        self.ttl, self._at, self._items = ttl, 0.0, []

    async def all(self) -> list[Product]:
        if self._items and time.monotonic() - self._at < self.ttl:
            return self._items
        self._items = await self._load()
        self._at = time.monotonic()
        return self._items

    async def get(self, product_id: str) -> Product | None:
        return next((p for p in await self.all() if p.id == product_id), None)

    async def _load(self) -> list[Product]:
        raise NotImplementedError


class FileCatalog(_Cached):
    def __init__(self, path: str, ttl: int = 30):
        super().__init__(ttl)
        self.path = Path(path)

    async def _load(self):
        try:
            return [Product.model_validate(x) for x in json.loads(self.path.read_text("utf-8"))]
        except (OSError, ValueError) as error:
            raise CatalogError(f"Cannot read catalogue file: {self.path}") from error


class ApiCatalog(_Cached):
    def __init__(self, base_url: str, ttl: int = 30, client: httpx.AsyncClient | None = None):
        super().__init__(ttl)
        self.client = client or httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=8)

    async def _load(self):
        try:
            response = await self.client.get("/api/products", params={"limit": 100})
            response.raise_for_status()
            return [Product.model_validate(x) for x in response.json()]
        except (httpx.HTTPError, ValueError) as error:
            raise CatalogError("Nexora API is unreachable") from error


def make_catalog(settings: Settings) -> Catalog:
    if settings.catalog_source == "api":
        return ApiCatalog(settings.nexora_api_base, settings.catalog_cache_seconds)
    return FileCatalog(settings.catalog_file, settings.catalog_cache_seconds)


def filter_products(
    products: list[Product],
    *,
    query: str | None = None,
    category: str | None = None,
    brand: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    in_stock_only: bool = False,
    sort: str | None = None,
) -> list[Product]:
    tokens = (query or "").casefold().split()
    result = []
    for p in products:
        text = p.haystack()
        if tokens and not all(t in text for t in tokens):
            continue
        if category and p.category != category:
            continue
        if brand and brand.casefold() not in p.brand.casefold():
            continue
        if min_price is not None and p.price < min_price:
            continue
        if max_price is not None and p.price > max_price:
            continue
        if in_stock_only and not p.in_stock:
            continue
        result.append(p)
    if sort == "price_asc":
        result.sort(key=lambda p: p.price)
    elif sort == "price_desc":
        result.sort(key=lambda p: -p.price)
    elif sort == "rating":
        result.sort(key=lambda p: (-p.rating, -p.review_count))
    return result
