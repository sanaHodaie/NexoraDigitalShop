"""Explicit capabilities; role names alone never authorize a request."""

MANAGEMENT_PERMISSIONS = (
    "assistant:read", "assistant:write",
    "admin:access", "dashboard:read", "products:read", "products:write",
    "orders:read", "orders:cancel", "orders:confirm_payment", "users:read",
    "sessions:revoke", "audit:read", "content:read", "content:write", "subscribers:read",
)

CATEGORY_IDS = {"smartphones", "laptops", "audio", "gaming", "smart-home", "wearables",
                "accessories", "cameras", "drones", "more"}
