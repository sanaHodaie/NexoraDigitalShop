from datetime import timedelta

from app.domain.entities import Line, Order, OrderStatus, aware, order_total, utcnow
from app.domain.errors import BusinessError


class InventoryReservation:
    @staticmethod
    def reserve(tx, items):
        lines = []
        for pid, quantity in sorted(items):
            if quantity <= 0 or not tx.inventory.reserve(pid, quantity):
                raise BusinessError(409, "Product unavailable or insufficient stock")
            product = tx.products.get(pid)
            lines.append(Line(pid, quantity, product.price, product.name))
        return lines

    @staticmethod
    def release(tx, order):
        for line in sorted(order.lines, key=lambda x: x.product_id):
            tx.inventory.release(line.product_id, line.quantity)


class Orders:
    def __init__(self, uow, reservation_minutes=20, require_verified=True, clock=utcnow):
        self.uow, self.minutes, self.require_verified, self.clock = (
            uow,
            reservation_minutes,
            require_verified,
            clock,
        )

    def create(self, uid, shipping_address=None, draft=False):
        with self.uow() as tx:
            user = tx.users.get(uid, lock=True)
            if self.require_verified and user.email_verified_at is None:
                raise BusinessError(403, "ابتدا ایمیل خود را تأیید کنید.", "EMAIL_NOT_VERIFIED")
            items = tx.cart.list(uid)
            if not items:
                raise BusinessError(400, "Cart is empty")
            if draft:
                products = tx.products.get_many([pid for pid, _ in items])
                if any(pid not in products or qty <= 0 or products[pid].stock < qty for pid, qty in items):
                    raise BusinessError(409, "Product unavailable or insufficient stock")
                lines = [Line(pid, qty, products[pid].price, products[pid].name) for pid, qty in items]
            else:
                lines = InventoryReservation.reserve(tx, items)
            now = self.clock()
            order = tx.orders.save(
                Order(
                    None,
                    uid,
                    order_total(lines),
                    OrderStatus.DRAFT if draft else OrderStatus.AWAITING_PAYMENT,
                    now,
                    None if draft else now + timedelta(minutes=self.minutes),
                    lines,
                    shipping_address=shipping_address,
                    customer_email=user.email,
                )
            )
            if not draft:
                tx.cart.clear(uid)
            tx.audit("INVOICE_DRAFT_CREATED" if draft else "ORDER_CREATED", uid, order.id)
            tx.commit()
            return order

    def submit(self, uid, oid, expected_revision=None):
        with self.uow() as tx:
            user = tx.users.get(uid, lock=True)
            order = tx.orders.get(oid, uid, lock=True)
            if order is None:
                raise BusinessError(404, "Order not found")
            # Retrying a successful submission must never reserve inventory twice.
            if order.status in {OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID}:
                return order
            if order.status != OrderStatus.DRAFT or not order.shipping_address:
                raise BusinessError(409, "پیش‌فاکتور معتبر و آدرس دریافت لازم است.")
            from app.domain.invoices import price_revision
            if expected_revision is not None and expected_revision != price_revision(order):
                raise BusinessError(409, 'قیمت پیش‌فاکتور تغییر کرده؛ مبلغ جدید را بررسی و تأیید کنید.', 'PRICE_CHANGED')
            if self.require_verified and user.email_verified_at is None:
                raise BusinessError(403, "ابتدا ایمیل خود را تأیید کنید.", "EMAIL_NOT_VERIFIED")
            if aware(order.created_at) + timedelta(hours=24) <= self.clock():
                raise BusinessError(409, "اعتبار پیش‌فاکتور تمام شده؛ پیش‌فاکتور جدید بگیرید.")
            items = [(line.product_id, line.quantity) for line in order.lines]
            if sorted(tx.cart.list(uid)) != sorted(items):
                raise BusinessError(409, "سبد خرید تغییر کرده؛ پیش‌فاکتور جدید بگیرید.")
            lines = InventoryReservation.reserve(tx, items)
            if {x.product_id: x.unit_price for x in lines} != {
                x.product_id: x.unit_price for x in order.lines
            }:
                raise BusinessError(409, "قیمت کالا تغییر کرده؛ قیمت جدید را در پیش‌فاکتور بررسی و دوباره تأیید کنید.", "PRICE_CHANGED")
            order.status = OrderStatus.AWAITING_PAYMENT
            order.reservation_expires_at = self.clock() + timedelta(minutes=self.minutes)
            tx.orders.save(order)
            tx.cart.clear(uid)
            tx.audit("ORDER_CREATED", uid, order.id)
            tx.commit()
            return order

    def refresh_draft(self, uid, oid):
        """Refresh an unreserved quote; never reprice a submitted or paid invoice."""
        with self.uow() as tx:
            tx.users.get(uid, lock=True)
            order = tx.orders.get(oid, uid, lock=True)
            if order is None:
                raise BusinessError(404, 'Order not found')
            if order.status != OrderStatus.DRAFT:
                return order
            if aware(order.created_at) + timedelta(hours=24) <= self.clock():
                raise BusinessError(409, 'اعتبار پیش‌فاکتور تمام شده؛ پیش‌فاکتور جدید بگیرید.')
            items = [(line.product_id, line.quantity) for line in order.lines]
            if sorted(tx.cart.list(uid)) != sorted(items):
                raise BusinessError(409, 'سبد خرید تغییر کرده؛ پیش‌فاکتور جدید بگیرید.')
            products = tx.products.get_many([pid for pid, _ in items])
            if any(pid not in products or products[pid].stock < qty for pid, qty in items):
                raise BusinessError(409, 'محصول ناموجود است یا موجودی کافی نیست؛ سبد خرید را بررسی کنید.')
            lines = [Line(pid, qty, products[pid].price, products[pid].name) for pid, qty in items]
            if order.lines != lines:
                order.lines, order.total = lines, order_total(lines)
                tx.orders.save(order)
                tx.audit('INVOICE_DRAFT_REPRICED', uid, oid)
                tx.commit()
            return order

    def list(self, uid):
        with self.uow() as tx:
            return tx.orders.list(uid)

    def get(self, uid, oid):
        with self.uow() as tx:
            order = tx.orders.get(oid, uid)
            if order is None:
                raise BusinessError(404, "Order not found")
        if (
            order.status == OrderStatus.AWAITING_PAYMENT
            and order.reservation_expires_at
            and aware(order.reservation_expires_at) <= self.clock()
        ):
            return self.expire(oid)
        return order

    def document(self, uid, oid, admin=False, warranty=False):
        with self.uow() as tx:
            if admin and (not tx.permitted(uid, "admin:access") or not tx.permitted(uid, "orders:read")):
                raise BusinessError(403, "دسترسی مجاز نیست.")
            order = tx.orders.get(oid, None if admin else uid)
            if order is None:
                raise BusinessError(404, "Order not found")
        order = self.get(order.user_id, oid)
        if warranty and order.status != OrderStatus.PAID:
            raise BusinessError(409, "کارت گارانتی فقط برای سفارش پرداخت‌شده صادر می‌شود.")
        return order

    def cancel(self, uid, oid):
        return self._release(oid, uid, False)

    def expire(self, oid):
        return self._release(oid, None, True)

    def _release(self, oid, uid, expired):
        with self.uow() as tx:
            order = tx.orders.get(oid, uid, lock=True)
            if order is None:
                raise BusinessError(404, "Order not found")
            if order.status in {OrderStatus.CANCELLED, OrderStatus.EXPIRED}:
                return order
            if order.status == OrderStatus.DRAFT:
                if expired:
                    return order
                order.status = OrderStatus.CANCELLED
                tx.orders.save(order)
                tx.audit("INVOICE_DRAFT_CANCELLED", uid, oid)
                tx.commit()
                return order
            if order.status not in {OrderStatus.PENDING, OrderStatus.AWAITING_PAYMENT}:
                if expired:
                    return order
                raise BusinessError(409, "این سفارش قابل لغو نیست.")
            is_due = order.reservation_expires_at and aware(order.reservation_expires_at) <= self.clock()
            if expired and not is_due:
                return order
            InventoryReservation.release(tx, order)
            order.status = OrderStatus.EXPIRED if is_due else OrderStatus.CANCELLED
            tx.orders.save(order)
            tx.audit("ORDER_EXPIRED" if is_due else "ORDER_CANCELLED", order.user_id, oid)
            tx.commit()
            return order

    def expire_due(self):
        with self.uow() as tx:
            ids = tx.orders.due(self.clock())
        for oid in ids:
            self.expire(oid)
        return len(ids)

    def confirm_payment(self, actor, oid, reference):
        """Management-only confirmation. No unverified browser payment callbacks."""
        with self.uow() as tx:
            if not tx.permitted(actor, "orders:confirm_payment"):
                raise BusinessError(403, "دسترسی مجاز نیست.")
            order = tx.orders.get(oid, lock=True)
            if order is None:
                raise BusinessError(404, "Order not found")
            if order.status == OrderStatus.PAID and order.payment_reference == reference:
                return order
            if (
                order.status != OrderStatus.AWAITING_PAYMENT
                or not order.reservation_expires_at
                or aware(order.reservation_expires_at) <= self.clock()
            ):
                raise BusinessError(409, "مهلت پرداخت تمام شده یا وضعیت سفارش معتبر نیست.")
            order.status, order.payment_reference = OrderStatus.PAID, reference
            order.paid_at = self.clock()
            tx.orders.save(order)
            tx.audit("PAYMENT_CONFIRMED", actor, oid)
            tx.commit()
            return order
