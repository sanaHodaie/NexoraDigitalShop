"""SQL read models and persistence for management; never expose ORM users/sessions."""
from datetime import timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.domain.entities import aware, utcnow
from app.domain.errors import BusinessError
from app.infrastructure import models as m


class ManagementRepository:
    def __init__(self, db):
        self.db = db

    def permissions(self, uid):
        return list(self.db.scalars(select(m.RolePermission.permission).join(
            m.UserRole, m.UserRole.role == m.RolePermission.role).where(m.UserRole.user_id == uid).distinct()))

    def save_media(self, key, content):
        if self.db.get(m.ProductMedia, key) is None:
            self.db.add(m.ProductMedia(key=key, content=content))

    def get_media(self, key):
        row = self.db.get(m.ProductMedia, key)
        return row.content if row else None

    def page(self, query, page, size, serialize):
        total = self.db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        return {"items": [serialize(row) for row in self.db.scalars(query.offset((page - 1) * size).limit(size))],
                "total": total, "page": page, "pageSize": size}

    @staticmethod
    def product(row):
        return {**row.payload, "id": row.id, "name": row.name, "nameEn": row.name_en,
                "category": row.category, "price": float(row.price), "stock": row.stock,
                "inStock": row.stock > 0, "isActive": row.is_active}

    def products(self, page, size, query, category=None):
        q = select(m.Product)
        if category:
            q = q.where(m.Product.category == category)
        if query:
            q = q.where(or_(m.Product.name.contains(query, autoescape=True),
                            m.Product.name_en.contains(query, autoescape=True), m.Product.id == query))
        return self.page(q.order_by(m.Product.id), page, size, self.product)

    def save_product(self, pid, data, create=False):
        row = self.db.scalar(select(m.Product).where(m.Product.id == pid).with_for_update())
        if create and row:
            raise BusinessError(409, "شناسهٔ محصول تکراری است.")
        if not create and row is None:
            raise BusinessError(404, "محصول پیدا نشد.")
        if row is not None and row.stock != data["expectedStock"]:
            raise BusinessError(409, "موجودی تغییر کرده است؛ محصول را دوباره باز کنید.")
        row = row or m.Product(id=pid, payload={})
        row.name, row.name_en, row.category = data["name"], data["nameEn"], data["category"]
        row.price, row.stock, row.is_active = data["price"], data["stock"], data["isActive"]
        row.payload = {**row.payload, **{k: v for k, v in data.items()
                                      if k not in {"expectedStock", "stock", "isActive", "price", "priceRial"}},
                       "id": pid, "price": float(row.price)}
        self.db.add(row)
        self.db.flush()
        return self.product(row)

    def archive(self, pid):
        row = self.db.scalar(select(m.Product).where(m.Product.id == pid).with_for_update())
        if row is None:
            raise BusinessError(404, "محصول پیدا نشد.")
        row.is_active = False

    def orders(self, page, size, query):
        q = select(m.Order).options(selectinload(m.Order.lines)).join(m.User)
        if query:
            q = q.where(or_(m.User.email.contains(query, autoescape=True), m.Order.status == query,
                            m.Order.id == (int(query) if query.isascii() and query.isdigit() else -1)))
        def output(row):
            user = self.db.get(m.User, row.user_id)
            return {"id": row.id, "userId": row.user_id, "email": user.email, "name": user.full_name,
                    "total": float(row.total), "status": row.status, "createdAt": aware(row.created_at),
                    "reservationExpiresAt": aware(row.reservation_expires_at) if row.reservation_expires_at else None,
                    "lines": [{"productId": line.product_id, "name": self.db.get(m.Product, line.product_id).name,
                               "quantity": line.quantity, "unitPrice": float(line.unit_price)} for line in row.lines]}
        return self.page(q.order_by(m.Order.id.desc()), page, size, output)

    def users(self, page, size, query):
        q = select(m.User)
        if query:
            q = q.where(or_(m.User.email.contains(query, autoescape=True), m.User.full_name.contains(query, autoescape=True)))
        def output(row):
            registered = self.db.scalar(select(func.min(m.AuditLog.created_at)).where(
                m.AuditLog.user_id == row.id, m.AuditLog.event == "REGISTER_SUCCESS"))
            login = self.db.scalar(select(func.max(m.AuditLog.created_at)).where(
                m.AuditLog.user_id == row.id, m.AuditLog.event == "LOGIN_SUCCESS"))
            return {"id": row.id, "email": row.email, "fullName": row.full_name,
                    "emailVerified": row.email_verified_at is not None,
                    "registeredAt": aware(registered) if registered else None,
                    "lastLoginAt": aware(login) if login else None,
                    "orders": self.db.scalar(select(func.count(m.Order.id)).where(m.Order.user_id == row.id))}
        return self.page(q.order_by(m.User.id.desc()), page, size, output)

    def subscribers(self, page, size, query):
        q = select(m.Subscriber).outerjoin(m.User, m.User.id == m.Subscriber.user_id)
        if query:
            q = q.where(or_(m.Subscriber.email.contains(query, autoescape=True),
                            m.User.email.contains(query, autoescape=True), m.User.full_name.contains(query, autoescape=True)))
        def output(row):
            user = self.db.get(m.User, row.user_id) if row.user_id else None
            return {'id': row.id, 'email': row.email, 'userId': row.user_id,
                    'userName': user.full_name if user else None, 'accountEmail': user.email if user else None,
                    'createdAt': aware(row.created_at) if row.created_at else None}
        return self.page(q.order_by(m.Subscriber.id.desc()), page, size, output)

    def audit_logs(self, before, after, event, size):
        q = select(m.AuditLog).outerjoin(m.User, m.AuditLog.user_id == m.User.id)
        if before:
            q = q.where(m.AuditLog.id < before)
        if after:
            q = q.where(m.AuditLog.id > after)
        if event:
            q = q.where(m.AuditLog.event == event)
        rows = list(self.db.scalars(q.order_by(m.AuditLog.id.desc()).limit(size + 1)))
        def output(row):
            user = self.db.get(m.User, row.user_id) if row.user_id else None
            return {"id": row.id, "event": row.event, "userId": row.user_id,
                    "email": user.email if user else None, "fullName": user.full_name if user else None,
                    "subjectId": row.subject_id, "createdAt": aware(row.created_at)}
        return {"items": [output(row) for row in rows[:size]], "hasMore": len(rows) > size,
                "serverTime": utcnow()}

    def activity(self, idle_seconds):
        now = utcnow()
        q = (select(m.User.id, m.User.email, m.User.full_name,
                    func.max(m.AuthSession.last_used_at), func.count(m.AuthSession.token_hash))
             .join(m.AuthSession, m.AuthSession.user_id == m.User.id)
             .where(m.AuthSession.revoked_at.is_(None), m.AuthSession.expires_at > now,
                    m.AuthSession.last_used_at > now - timedelta(seconds=min(300, idle_seconds)))
             .group_by(m.User.id, m.User.email, m.User.full_name)
             .order_by(func.max(m.AuthSession.last_used_at).desc()).limit(100))
        return {"items": [{"id": uid, "email": email, "fullName": name, "lastUsedAt": aware(last),
                           "sessions": count} for uid, email, name, last, count in self.db.execute(q)],
                "windowSeconds": min(300, idle_seconds), "serverTime": now}

    def dashboard(self):
        def count(cls):
            return self.db.scalar(select(func.count()).select_from(cls))
        statuses = dict(self.db.execute(select(m.Order.status, func.count()).group_by(m.Order.status)).all())
        daily = dict(self.db.execute(select(func.date(m.Order.created_at), func.sum(m.Order.total)).where(
            m.Order.status == "paid", m.Order.created_at >= utcnow() - timedelta(days=30)
        ).group_by(func.date(m.Order.created_at))).all())
        return {"products": count(m.Product), "users": count(m.User), "orders": count(m.Order),
                "subscribers": count(m.Subscriber), "statuses": statuses,
                "revenue": float(self.db.scalar(select(func.coalesce(func.sum(m.Order.total), 0)).where(m.Order.status == "paid"))),
                "lowStock": self.db.scalar(select(func.count()).select_from(m.Product).where(m.Product.stock < 5, m.Product.is_active.is_(True))),
                "daily": [{"date": str((utcnow() - timedelta(days=i)).date()),
                           "value": float(daily.get(str((utcnow() - timedelta(days=i)).date()), daily.get((utcnow() - timedelta(days=i)).date(), 0)))}
                          for i in reversed(range(30))]}

    def documents(self):
        return {r.key: {"data": r.data, "version": r.version, "updatedAt": aware(r.updated_at)}
                for r in self.db.scalars(select(m.SiteDocument))}

    def save_document(self, key, data, version):
        row = self.db.scalar(select(m.SiteDocument).where(m.SiteDocument.key == key).with_for_update())
        if row is None or row.version != version:
            raise BusinessError(409, "محتوا تغییر کرده است؛ آخرین نسخه را دوباره دریافت کنید.")
        row.data, row.version, row.updated_at = data, row.version + 1, utcnow()
        return {"data": row.data, "version": row.version, "updatedAt": row.updated_at}
