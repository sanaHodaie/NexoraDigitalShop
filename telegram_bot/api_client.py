
"""کلاینت اتصال به API بک‌اند فروشگاه NexoraDigitalShop.

خطاها عمداً از هم تفکیک شده‌اند:
- ApiNetworkError  → بک‌اند در دسترس نیست.
- ApiHttpError     → بک‌اند پاسخ HTTP خطا داده است.
- ApiDataError     → پاسخ JSON معتبر یا قابل تفسیر نیست.
"""

import asyncio
import logging
from copy import deepcopy
from dataclasses import dataclass, field
from time import monotonic
from typing import Any
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """خطای پایه ارتباط با بک‌اند فروشگاه."""


class ApiNetworkError(ApiError):
    """خطای شبکه یا تایم‌اوت."""


class ApiHttpError(ApiError):
    """بک‌اند پاسخ داده اما وضعیت HTTP خطا بوده است."""

    def __init__(self, status_code: int):
        self.status_code = status_code
        super().__init__(f"HTTP {status_code}")


class ApiDataError(ApiError):
    """پاسخ بک‌اند قابل تفسیر نبود."""


# --------------------------------------------------
# Product field mappings
# --------------------------------------------------

_ID_KEYS = ("id", "product_id", "_id", "slug")
_NAME_KEYS = ("name", "title", "product_name", "fa_name")

_PRICE_KEYS = (
    "price",
    "final_price",
    "amount",
    "cost",
    "price_toman",
    "price_irt",
    "originalPrice",
)

_STOCK_KEYS = (
    "in_stock",
    "available",
    "is_available",
    "stock",
    "stock_quantity",
    "quantity",
    "inventory",
    "count",
)

_IN_STOCK_KEYS = (
    "inStock",
    "in_stock",
    "available",
    "is_available",
)

_IMAGE_KEYS = (
    "image",
    "image_url",
    "img",
    "photo",
    "thumbnail",
    "thumbnail_url",
    "main_image",
    "cover",
)

_DESC_KEYS = (
    "description",
    "desc",
    "details",
    "summary",
    "body",
    "spec",
)

_LIST_KEYS = ("items", "results", "data", "products")


def _first(d: dict, keys) -> Any:
    for key in keys:
        if key in d and d[key] is not None:
            return d[key]

    return None


@dataclass
class Product:
    id: str
    name: str
    price: Any = None
    available: bool | None = None
    stock: int | None = None
    image: str | None = None
    description: str | None = None
    raw: dict = field(default_factory=dict)


def normalize_product(raw: Any) -> Product | None:
    """یک محصول خام API را به ساختار استاندارد تبدیل می‌کند."""

    if not isinstance(raw, dict):
        return None

    pid = _first(raw, _ID_KEYS)
    name = _first(raw, _NAME_KEYS)

    if pid is None and name is None:
        return None

    price = _first(raw, _PRICE_KEYS)
    stock_value = _first(raw, _STOCK_KEYS)

    available: bool | None = None
    stock: int | None = None

    in_stock_flag = _first(raw, _IN_STOCK_KEYS)

    if isinstance(in_stock_flag, bool):
        available = in_stock_flag

    elif isinstance(stock_value, bool):
        available = stock_value

    elif isinstance(stock_value, (int, float)):
        stock = int(stock_value)
        available = stock > 0

    elif in_stock_flag is not None:
        available = bool(in_stock_flag)

    image = _first(raw, _IMAGE_KEYS)
    description = _first(raw, _DESC_KEYS)

    return Product(
        id=str(pid if pid is not None else name),
        name=str(name) if name is not None else str(pid),
        price=price,
        available=available,
        stock=stock,
        image=str(image) if image is not None else None,
        description=(
            str(description)
            if description is not None
            else None
        ),
        raw=raw,
    )


def _extract_list(payload: Any) -> list:
    """پاسخ API را به فهرست محصولات تبدیل می‌کند."""

    if isinstance(payload, list):
        return payload

    if isinstance(payload, dict):
        for key in _LIST_KEYS:
            value = payload.get(key)

            if isinstance(value, list):
                return value

    return []


class NexoraClient:
    """کلاینت async ارتباط با بک‌اند فروشگاه Nexora."""

    def __init__(
        self,
        base_url: str,
        products_path: str = "/api/products",
        product_detail_path: str = "",
        timeout: float = 10.0,
        telegram_bot_api_key: str = "",
        telegram_confirm_path: str = "/internal/telegram/link-confirmations",
        catalogue_cache_seconds: float = 30,
    ):
        self._catalogue_cache_seconds = catalogue_cache_seconds
        self._catalogue_cache = {}
        self._catalogue_lock = asyncio.Lock()
        self._products_path = products_path
        self._product_detail_path = product_detail_path

        self._telegram_bot_api_key = telegram_bot_api_key
        self._telegram_confirm_path = telegram_confirm_path

        self._client = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    # --------------------------------------------------
    # Products
    # --------------------------------------------------

    async def get_products(
        self,
        query: str | None = None,
        category: str | None = None,
    ) -> list[Product]:
        # Search and single-product details always remain fresh.
        if query or self._catalogue_cache_seconds <= 0:
            return await self._fetch_products(query, category)
        async with self._catalogue_lock:
            entry = self._catalogue_cache.get(category)
            if entry and entry[0] > monotonic():
                return deepcopy(entry[1])
            products = await self._fetch_products(query, category)
            # Keep the cache bounded even if many different category strings arrive.
            if len(self._catalogue_cache) >= 64:
                self._catalogue_cache.clear()
            self._catalogue_cache[category] = (monotonic() + self._catalogue_cache_seconds, deepcopy(products))
            return products

    async def _fetch_products(self, query=None, category=None):
        """Fetch without caching errors; retain the backend's query contract."""

        params: dict[str, str] = {}

        if query:
            params["q"] = query

        if category:
            params["category"] = category

        try:
            response = await self._client.get(
                self._products_path,
                params=params,
            )

        except httpx.HTTPError as exc:
            raise ApiNetworkError(
                "ارتباط با بک‌اند برقرار نشد."
            ) from exc

        if response.status_code >= 400:
            raise ApiHttpError(response.status_code)

        try:
            payload = response.json()

        except ValueError as exc:
            raise ApiDataError(
                "پاسخ JSON معتبر نبود."
            ) from exc

        if not isinstance(payload, list) and not (
            isinstance(payload, dict) and any(isinstance(payload.get(k), list) for k in _LIST_KEYS)
        ):
            raise ApiDataError("ساختار فهرست محصولات معتبر نیست.")

        products: list[Product] = []

        for raw in _extract_list(payload):
            product = normalize_product(raw)

            if product is not None:
                products.append(product)

        if not products:
            logger.warning(
                "فهرست محصولات خالی بود یا ساختار پاسخ قابل شناسایی نبود."
            )

        return products

    async def get_product(
        self,
        product_id: str,
        cached: list[Product] | None = None,
    ) -> Product | None:
        """دریافت جزئیات محصول یا جستجو در فهرست کش‌شده."""

        if self._product_detail_path:
            url = self._product_detail_path.format(
                id=quote(product_id, safe="")
            )

            try:
                response = await self._client.get(url)

            except httpx.HTTPError as exc:
                raise ApiNetworkError(
                    "ارتباط با بک‌اند برقرار نشد."
                ) from exc

            if response.status_code == 404:
                return None

            if response.status_code >= 400:
                raise ApiHttpError(response.status_code)

            try:
                payload = response.json()

            except ValueError as exc:
                raise ApiDataError(
                    "پاسخ JSON معتبر نبود."
                ) from exc

            if (
                isinstance(payload, dict)
                and isinstance(payload.get("data"), dict)
            ):
                payload = payload["data"]

            product = normalize_product(payload)

            if product is not None:
                return product

        if cached:
            for product in cached:
                if product.id == product_id:
                    return product

        return None

    # --------------------------------------------------
    # Telegram security
    # --------------------------------------------------

    def _telegram_headers(self) -> dict[str, str]:
        """ساخت هدر احراز هویت ارتباط داخلی ربات."""

        if not self._telegram_bot_api_key:
            raise ApiDataError(
                "کلید ارتباط امن با بک‌اند تنظیم نشده است."
            )

        return {
            "X-Telegram-Bot-Key": self._telegram_bot_api_key,
        }

    # --------------------------------------------------
    # Direct Telegram linking
    # --------------------------------------------------

    async def complete_telegram_direct_link(
        self,
        token: str,
        telegram_user_id: int,
    ) -> dict[str, Any]:
        """
        روش جدید اتصال مستقیم.

        پس از اجرای /start TOKEN در ربات،
        این تابع توکن را همراه شناسه واقعی تلگرام
        به بک‌اند ارسال می‌کند.
        """

        if (
            not isinstance(token, str)
            or not token
            or len(token) > 128
        ):
            raise ApiDataError(
                "توکن اتصال معتبر نیست."
            )

        if (
            type(telegram_user_id) is not int
            or telegram_user_id <= 0
        ):
            raise ApiDataError(
                "شناسه تلگرام معتبر نیست."
            )

        headers = self._telegram_headers()

        try:
            response = await self._client.post(
                self._telegram_confirm_path,
                json={
                    "token": token,
                    "telegram_user_id": telegram_user_id,
                },
                headers=headers,
            )

        except httpx.HTTPError as exc:
            raise ApiNetworkError(
                "ارتباط با بک‌اند برای تکمیل اتصال برقرار نشد."
            ) from exc

        if response.status_code >= 400:
            raise ApiHttpError(response.status_code)

        try:
            payload = response.json()

        except ValueError as exc:
            raise ApiDataError(
                "پاسخ تکمیل اتصال معتبر نیست."
            ) from exc

        if (
            not isinstance(payload, dict)
            or payload.get("linked") is not True
        ):
            raise ApiDataError(
                "بک‌اند اتصال حساب تلگرام را تأیید نکرد."
            )

        return payload

    # --------------------------------------------------
    # Health check
    # --------------------------------------------------

    async def _customer_request(self, method, path, payload=None):
        try:
            response = await self._client.request(method, path, headers=self._telegram_headers(), json=payload)
        except httpx.HTTPError as exc:
            raise ApiNetworkError("Customer service unavailable") from exc
        if response.status_code >= 400:
            raise ApiHttpError(response.status_code)
        try:
            return response.json()
        except ValueError as exc:
            raise ApiDataError("Invalid customer-service response") from exc

    async def create_customer_request(self, payload):
        result = await self._customer_request('POST', '/internal/telegram/customer-requests', payload)
        if not isinstance(result, dict) or type(result.get('id')) is not int:
            raise ApiDataError("Request registration was not confirmed")
        return result

    async def customer_requests(self, uid):
        result = await self._customer_request('GET', f'/internal/telegram/customer-requests/{int(uid)}')
        if not isinstance(result, dict) or not isinstance(result.get('items'), list):
            raise ApiDataError("Invalid request list")
        return result

    async def health(self) -> bool:
        """بررسی دسترسی به بک‌اند از مسیر /health."""

        try:
            response = await self._client.get("/health")

            return response.status_code == 200

        except httpx.HTTPError:
            return False
