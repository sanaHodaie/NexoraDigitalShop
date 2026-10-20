"""Tools the model may call. All read-only except `suggest_add_to_cart`, which
only *records a proposal*: the browser executes it with the shopper's own
session and CSRF token, so the agent never holds credentials or mutates data.
"""

from typing import Any

from nexora_agent.catalog import Catalog, CatalogError, Product, filter_products
from nexora_agent.config import Settings
from nexora_agent.formatting import rial_text

MAX_RESULTS = 8

TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_products",
        "description": (
            "Search the Nexora catalogue. All filters are optional and combine with AND. "
            "Prices are in rial (the currency the shop displays). If the shopper speaks in "
            "toman, multiply by 10 first. Always call this before recommending anything."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Free text: name, model, feature (Persian or English)."},
                "category": {"type": "string", "description": "Category id from list_categories."},
                "brand": {"type": "string"},
                "min_price_rial": {"type": "number"},
                "max_price_rial": {"type": "number"},
                "in_stock_only": {"type": "boolean"},
                "sort": {"type": "string", "enum": ["price_asc", "price_desc", "rating"]},
                "limit": {"type": "integer", "minimum": 1, "maximum": MAX_RESULTS},
            },
        },
    },
    {
        "name": "get_product",
        "description": "Full details of one product, including its description.",
        "input_schema": {
            "type": "object",
            "properties": {"product_id": {"type": "string"}},
            "required": ["product_id"],
        },
    },
    {
        "name": "compare_products",
        "description": "Side-by-side data for 2 to 4 products.",
        "input_schema": {
            "type": "object",
            "properties": {
                "product_ids": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 4}
            },
            "required": ["product_ids"],
        },
    },
    {
        "name": "list_categories",
        "description": "Categories with ids, Persian names and product counts.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_shop_policies",
        "description": "Shipping, free-shipping threshold, payment and reservation rules. Use for any policy question.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "suggest_add_to_cart",
        "description": (
            "Offer the shopper an 'add to cart' button for an in-stock product. This does NOT "
            "add anything; the shopper must tap the button. Use only when they show buying intent."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "product_id": {"type": "string"},
                "quantity": {"type": "integer", "minimum": 1, "maximum": 10},
            },
            "required": ["product_id"],
        },
    },
]


def _num(value) -> float | None:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


class ToolRunner:
    """One instance per user request: it collects proposed actions and seen products."""

    def __init__(self, catalog: Catalog, settings: Settings):
        self.catalog, self.settings = catalog, settings
        self.actions: list[dict] = []
        self.seen: dict[str, Product] = {}

    # --- public -----------------------------------------------------------
    async def run(self, name: str, args: dict) -> tuple[dict, bool]:
        """Return (result, is_error)."""
        handler = getattr(self, f"_{name}", None) if name in {t["name"] for t in TOOLS} else None
        if handler is None:
            return {"error": f"Unknown tool: {name}"}, True
        try:
            result = await handler(args if isinstance(args, dict) else {})
        except CatalogError:
            return {"error": "catalog_unavailable", "note": "اطلاعات فروشگاه موقتاً در دسترس نیست."}, True
        except Exception:  # malformed model arguments must never take the request down
            return {"error": "invalid_arguments"}, True
        return result, "error" in result

    def ui_cards(self, text: str, limit: int = 4) -> list[dict]:
        """Product cards for products the final answer actually mentions."""
        folded = text.casefold()
        cards = []
        for p in self.seen.values():
            if p.name.casefold() in folded or (p.name_en and p.name_en.casefold() in folded):
                cards.append(
                    {
                        "id": p.id,
                        "name": p.name,
                        "category": p.category,
                        "priceText": rial_text(p.price, self.settings.rial_rate),
                        "inStock": p.in_stock,
                    }
                )
        return cards[:limit]

    # --- helpers ----------------------------------------------------------
    def _view(self, p: Product, detail: bool = False) -> dict:
        self.seen[p.id] = p
        data = {
            "id": p.id,
            "name": p.name,
            "name_en": p.name_en,
            "brand": p.brand,
            "category": p.category,
            "category_fa": p.category_fa,
            "price": rial_text(p.price, self.settings.rial_rate),
            "in_stock": p.in_stock,
            # rating 0 with no reviews means "not rated yet", never "bad".
            "rating": p.rating if p.review_count else None,
            "review_count": p.review_count,
            "specs": p.specs,
        }
        if detail:
            data["description"] = p.description
            data["sample_price"] = p.demo
        return data

    # --- tools ------------------------------------------------------------
    async def _search_products(self, a: dict) -> dict:
        rate = self.settings.rial_rate
        low, high = _num(a.get("min_price_rial")), _num(a.get("max_price_rial"))
        limit = a.get("limit")
        limit = min(max(limit, 1), MAX_RESULTS) if isinstance(limit, int) and not isinstance(limit, bool) else 5
        found = filter_products(
            await self.catalog.all(),
            query=a.get("query") if isinstance(a.get("query"), str) else None,
            category=a.get("category") if isinstance(a.get("category"), str) else None,
            brand=a.get("brand") if isinstance(a.get("brand"), str) else None,
            min_price=low / rate if low is not None else None,
            max_price=high / rate if high is not None else None,
            in_stock_only=a.get("in_stock_only") is True,
            sort=a["sort"] if isinstance(a.get("sort"), str) and a["sort"] in {"price_asc", "price_desc", "rating"} else None,
        )
        return {
            "total_matches": len(found),
            "returned": min(len(found), limit),
            "products": [self._view(p) for p in found[:limit]],
        }

    async def _get_product(self, a: dict) -> dict:
        p = await self.catalog.get(str(a.get("product_id", "")))
        return self._view(p, detail=True) if p else {"error": "product_not_found"}

    async def _compare_products(self, a: dict) -> dict:
        ids = a.get("product_ids")
        if not isinstance(ids, list) or not 2 <= len(ids) <= 4:
            return {"error": "Provide 2 to 4 product ids."}
        found, missing = [], []
        for pid in ids:
            p = await self.catalog.get(str(pid))
            (found if p else missing).append(self._view(p) if p else str(pid))
        return {"products": found, "not_found": missing}

    async def _list_categories(self, a: dict) -> dict:
        groups: dict[str, dict] = {}
        for p in await self.catalog.all():
            g = groups.setdefault(p.category, {"id": p.category, "name_fa": p.category_fa, "count": 0})
            g["count"] += 1
        return {"categories": list(groups.values())}

    async def _get_shop_policies(self, a: dict) -> dict:
        s = self.settings
        products = await self.catalog.all()
        return {
            "prices_shown_in": "ریال",
            "free_shipping_from": rial_text(s.free_shipping_threshold, s.rial_rate),
            "shipping_fee_below_threshold": rial_text(s.shipping_fee, s.rial_rate),
            "stock_reserved_for_minutes_after_order": s.reservation_minutes,
            "online_payment_active": False,
            "login_required_for_cart_and_orders": True,
            "email_verification_may_be_required_at_checkout": True,
            "catalogue_prices_are_samples": any(p.demo for p in products),
        }

    async def _suggest_add_to_cart(self, a: dict) -> dict:
        p = await self.catalog.get(str(a.get("product_id", "")))
        if p is None:
            return {"error": "product_not_found"}
        if not p.in_stock:
            return {"error": "out_of_stock"}
        q = a.get("quantity")
        q = min(max(q, 1), 10) if isinstance(q, int) and not isinstance(q, bool) else 1
        if not any(x["productId"] == p.id for x in self.actions):
            self.actions.append({"type": "add_to_cart", "productId": p.id, "productName": p.name, "quantity": q})
        return {"status": "button_shown_to_shopper", "note": "Nothing was added until the shopper taps it."}
