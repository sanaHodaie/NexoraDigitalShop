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

    def create(self, uid):
        with self.uow() as tx:
            user = tx.users.get(uid, lock=True)
            if self.require_verified and user.email_verified_at is None:
                raise BusinessError(403, "ابتدا ایمیل خود را تأیید کنید.", "EMAIL_NOT_VERIFIED")
            items = tx.cart.list(uid)
            if not items:
                raise BusinessError(400, "Cart is empty")
            lines = InventoryReservation.reserve(tx, items)
            now = self.clock()
            order = tx.orders.save(
                Order(
                    None,
                    uid,
                    order_total(lines),
                    OrderStatus.AWAITING_PAYMENT,
                    now,
                    now + timedelta(minutes=self.minutes),
                    lines,
                )
            )
            tx.cart.clear(uid)
            tx.audit("ORDER_CREATED", uid, order.id)
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
            tx.orders.save(order)
            tx.audit("PAYMENT_CONFIRMED", actor, oid)
            tx.commit()
            return order
