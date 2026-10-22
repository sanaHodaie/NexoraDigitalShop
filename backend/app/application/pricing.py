"""Bulk repricing with a server-calculated preview and optimistic confirmation."""
import hashlib
import json
from decimal import ROUND_HALF_UP, Decimal

from app.application.management import Management
from app.domain.errors import BusinessError

RATE = Decimal(600000)


def rial(price):
    return int((price * RATE).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


class BulkPricing:
    def __init__(self, uow):
        self.uow = uow

    def brands(self, uid, category):
        with self.uow() as tx:
            Management.authorize(tx, uid, 'products:write')
            return tx.management.product_brands(category)

    def change(self, uid, category, brand, percent, snapshot=None):
        with self.uow() as tx:
            Management.authorize(tx, uid, 'products:write')
            products = tx.management.price_candidates(category, brand, lock=snapshot is not None)
            if len(products) > 1000:
                raise BusinessError(400, 'حداکثر ۱۰۰۰ محصول را یک‌جا تغییر دهید؛ فیلتر برند را محدودتر کنید.')
            # No browser-supplied price or product IDs are trusted. Membership and
            # raw prices are re-read and locked at confirmation time.
            digest = hashlib.sha256(json.dumps([uid, category, brand, str(percent.normalize()), [
                [p['id'], str(p['price']), p['name'], p['brand'], p['isActive']] for p in products
            ]], ensure_ascii=False).encode()).hexdigest()
            if snapshot is not None and snapshot != digest:
                raise BusinessError(409, 'قیمت یا فهرست محصولات تغییر کرده است؛ پیش‌نمایش تازه بگیرید.', 'PRICE_PREVIEW_STALE')
            items, updates = [], []
            for product in products:
                before = rial(product['price'])
                after = int((Decimal(before) * (1 + percent / 100)).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
                if after > 600000000000:
                    raise BusinessError(400, 'قیمت جدید یکی از محصولات از سقف مجاز بالاتر است؛ درصد را کاهش دهید.')
                items.append({k: product[k] for k in ('id', 'name', 'brand', 'isActive')} |
                             {'oldPriceRial': before, 'newPriceRial': after, 'differenceRial': after - before})
                if after != before:
                    updates.append((product['id'], product['price'],
                                    (Decimal(after) / RATE).quantize(Decimal('0.000000000001'))))
            if snapshot is not None:
                for pid, old_price, new_price in updates:
                    tx.management.set_product_price(pid, old_price, new_price)
                    tx.audit('PRODUCT_PRICE_CHANGED', uid, pid)
                tx.commit()
            return {'items': items, 'snapshot': digest, 'total': len(items),
                    'changed': len(updates), 'applied': snapshot is not None,
                    'percent': percent, 'category': category, 'brand': brand}
