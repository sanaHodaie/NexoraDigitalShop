from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from enum import StrEnum


def utcnow():
    return datetime.now(timezone.utc)


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


class OrderStatus(StrEnum):
    PENDING = "pending"
    AWAITING_PAYMENT = "pending_payment"  # Preserve the existing public contract.
    PAID = "paid"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


@dataclass
class User:
    id: int | None
    email: str
    password_hash: str | None = None
    full_name: str = ""
    google_subject: str | None = None
    email_verified_at: datetime | None = None


@dataclass
class Session:
    token_hash: str
    user_id: int
    expires_at: datetime
    created_at: datetime
    last_used_at: datetime
    revoked_at: datetime | None = None

    def active(self, now, idle_seconds):
        return (
            self.revoked_at is None
            and aware(self.expires_at) > now
            and (now - aware(self.last_used_at)).total_seconds() < idle_seconds
        )


@dataclass
class Product:
    id: str
    name: str
    name_en: str
    category: str
    price: Decimal
    stock: int
    payload: dict = field(default_factory=dict)

    def public(self):
        return {**self.payload, "price": float(self.price), "inStock": self.stock > 0}


@dataclass
class Line:
    product_id: str
    quantity: int
    unit_price: Decimal
    name: str = ""


@dataclass
class Order:
    id: int | None
    user_id: int
    total: Decimal
    status: str
    created_at: datetime
    reservation_expires_at: datetime | None
    lines: list[Line] = field(default_factory=list)
    payment_reference: str | None = None

    @property
    def shipping(self):
        return self.total - sum((line.unit_price * line.quantity for line in self.lines), Decimal("0"))


def order_total(lines):
    subtotal = sum((line.unit_price * line.quantity for line in lines), Decimal("0"))
    return subtotal + (Decimal("0") if subtotal >= 99 else Decimal("9.99"))
