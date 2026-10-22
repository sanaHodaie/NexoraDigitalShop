"""Shared customer/admin invoice representation; monetary facts originate in the order."""

import hashlib
import json
from decimal import ROUND_HALF_UP, Decimal

from app.domain.entities import aware


def price_revision(order):
    return hashlib.sha256(json.dumps([order.id, str(order.total.normalize()), [
        [line.product_id, line.quantity, str(line.unit_price.normalize())] for line in order.lines
    ]]).encode()).hexdigest()


def invoice_data(order):
    def rial(value):
        return int((value * order.rial_rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

    subtotal = sum((x.unit_price * x.quantity for x in order.lines), Decimal("0"))
    return {
        "id": order.id,
        "invoiceId": order.id,
        "priceRevision": price_revision(order),
        "status": order.status,
        "createdAt": aware(order.created_at),
        "paidAt": aware(order.paid_at) if order.paid_at else None,
        "reservationExpiresAt": aware(order.reservation_expires_at) if order.reservation_expires_at else None,
        "email": order.customer_email,
        "shippingAddress": order.shipping_address,
        "currency": "IRR",
        "total": float(order.total),
        "shipping": float(order.shipping),
        "subtotalRial": rial(subtotal),
        "shippingRial": rial(order.shipping),
        "totalRial": rial(order.total),
        "lines": [
            {
                "productId": x.product_id,
                "name": x.name,
                "quantity": x.quantity,
                "unitPrice": float(x.unit_price),
                "unitPriceRial": rial(x.unit_price),
                "totalRial": rial(x.unit_price * x.quantity),
            }
            for x in order.lines
        ],
    }
