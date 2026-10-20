"""Management use cases: authorization and transactions, without ORM dependencies."""
from app.application.orders import InventoryReservation
from app.domain.entities import OrderStatus, aware, utcnow
from app.domain.errors import BusinessError
from app.domain.management import MANAGEMENT_PERMISSIONS


class Management:
    def __init__(self, uow, idle_seconds):
        self.uow, self.idle_seconds = uow, idle_seconds

    @staticmethod
    def authorize(tx, uid, permission):
        if not tx.permitted(uid, "admin:access") or not tx.permitted(uid, permission):
            raise BusinessError(403, "دسترسی مدیریت برای این حساب فعال نیست.", "FORBIDDEN")

    def me(self, uid):
        with self.uow() as tx:
            self.authorize(tx, uid, "admin:access")
            user = tx.users.get(uid)
            return {"id": uid, "email": user.email, "name": user.full_name,
                    "permissions": [p for p in tx.management.permissions(uid) if p in MANAGEMENT_PERMISSIONS]}

    def upload_image(self, uid, raw, processor):
        import hashlib
        with self.uow() as tx:
            self.authorize(tx, uid, 'products:write')
            content = processor(raw)
            key = hashlib.sha256(content).hexdigest()
            tx.management.save_media(key, content)
            tx.commit()
            return {'url': f'/api/media/{key}.webp'}

    def media(self, key):
        with self.uow() as tx:
            content = tx.management.get_media(key)
            if content is None:
                raise BusinessError(404, 'Image not found')
            return content

    def read(self, uid, resource, **kwargs):
        permission = {"dashboard": "dashboard:read", "products": "products:read", "orders": "orders:read",
                      "users": "users:read", "audit_logs": "audit:read", "activity": "audit:read",
                      "documents": "content:read", "subscribers": "subscribers:read"}[resource]
        with self.uow() as tx:
            self.authorize(tx, uid, permission)
            if resource == "activity":
                kwargs["idle_seconds"] = self.idle_seconds
            return getattr(tx.management, resource)(**kwargs)

    def save_product(self, uid, pid, data, create=False):
        with self.uow() as tx:
            self.authorize(tx, uid, "products:write")
            result = tx.management.save_product(pid, data, create)
            tx.audit("PRODUCT_CREATED" if create else "PRODUCT_UPDATED", uid, pid)
            tx.commit()
            return result

    def archive_product(self, uid, pid):
        with self.uow() as tx:
            self.authorize(tx, uid, "products:write")
            tx.management.archive(pid)
            tx.audit("PRODUCT_ARCHIVED", uid, pid)
            tx.commit()

    def revoke_sessions(self, uid, target):
        with self.uow() as tx:
            self.authorize(tx, uid, "sessions:revoke")
            if tx.users.get(target, lock=True) is None:
                raise BusinessError(404, "کاربر پیدا نشد.")
            tx.sessions.revoke(target, utcnow())
            tx.audit("ADMIN_SESSIONS_REVOKED", uid, target)
            tx.commit()

    def cancel_order(self, uid, oid):
        with self.uow() as tx:
            self.authorize(tx, uid, "orders:cancel")
            order = tx.orders.get(oid, lock=True)
            if order is None:
                raise BusinessError(404, "سفارش پیدا نشد.")
            if order.status not in {OrderStatus.PENDING, OrderStatus.AWAITING_PAYMENT}:
                raise BusinessError(409, "فقط سفارش پرداخت‌نشده قابل لغو است.")
            InventoryReservation.release(tx, order)
            order.status = OrderStatus.CANCELLED
            tx.orders.save(order)
            tx.audit("ADMIN_ORDER_CANCELLED", uid, oid)
            tx.commit()

    def save_document(self, uid, key, data, version):
        with self.uow() as tx:
            self.authorize(tx, uid, "content:write")
            result = tx.management.save_document(key, data, version)
            tx.audit("CONTENT_UPDATED", uid, key)
            tx.commit()
            return result

    def public_content(self):
        with self.uow() as tx:
            docs = {key: value["data"] for key, value in tx.management.documents().items()
                    if key in {"home", "categories", "articles", "settings"}}
            if "articles" in docs:
                docs["articles"]["items"] = [a for a in docs["articles"]["items"] if a.get("published", True)]
            return docs
