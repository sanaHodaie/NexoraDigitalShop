from dataclasses import asdict

from sqlalchemy import delete, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.domain import entities as e
from app.domain.errors import Conflict
from app.infrastructure import models as m


def user_entity(row):
    return None if row is None else e.User(**{key: getattr(row, key) for key in e.User.__dataclass_fields__})


class Users:
    def __init__(self, db):
        self.db = db

    def get(self, uid, lock=False):
        q = select(m.User).where(m.User.id == uid).execution_options(populate_existing=True)
        return user_entity(self.db.scalar(q.with_for_update() if lock else q))

    def by_email(self, email, lock=False):
        q = select(m.User).where(m.User.email == email).execution_options(populate_existing=True)
        return user_entity(self.db.scalar(q.with_for_update() if lock else q))

    def by_google(self, subject):
        return user_entity(self.db.scalar(select(m.User).where(m.User.google_subject == subject)))

    def save(self, user):
        row = self.db.get(m.User, user.id) if user.id else m.User()
        for key, value in asdict(user).items():
            if key != "id":
                setattr(row, key, value)
        self.db.add(row)
        self.db.flush()
        user.id = row.id
        return user


class Sessions:
    def __init__(self, db):
        self.db = db

    def get(self, digest, lock=False):
        q = (
            select(m.AuthSession)
            .where(m.AuthSession.token_hash == digest)
            .execution_options(populate_existing=True)
        )
        row = self.db.scalar(q.with_for_update() if lock else q)
        return (
            None if row is None else e.Session(**{k: getattr(row, k) for k in e.Session.__dataclass_fields__})
        )

    def save(self, session):
        self.db.merge(m.AuthSession(**asdict(session)))

    def revoke(self, uid, now, digest=None):
        q = update(m.AuthSession).where(m.AuthSession.user_id == uid, m.AuthSession.revoked_at.is_(None))
        if digest:
            q = q.where(m.AuthSession.token_hash == digest)
        self.db.execute(q.values(revoked_at=now))


class Products:
    def __init__(self, db):
        self.db = db

    def entity(self, row):
        return (
            None if row is None else e.Product(**{k: getattr(row, k) for k in e.Product.__dataclass_fields__})
        )

    def get(self, pid):
        return self.entity(self.db.get(m.Product, pid))

    def get_many(self, ids):
        return {
            row.id: self.entity(row)
            for row in self.db.scalars(select(m.Product).where(m.Product.id.in_(ids)))
        }

    def search(self, query, category, limit):
        q = select(m.Product)
        if query:
            q = q.where(
                or_(
                    m.Product.name.contains(query, autoescape=True),
                    m.Product.name_en.contains(query, autoescape=True),
                )
            )
        if category:
            q = q.where(m.Product.category == category)
        return [self.entity(row) for row in self.db.scalars(q.order_by(m.Product.id).limit(limit))]


class Cart:
    def __init__(self, db):
        self.db = db

    def list(self, uid):
        return list(
            self.db.execute(
                select(m.CartItem.product_id, m.CartItem.quantity)
                .where(m.CartItem.user_id == uid)
                .order_by(m.CartItem.product_id)
            )
        )

    def put(self, uid, pid, quantity):
        item = self.db.get(m.CartItem, (uid, pid))
        if quantity == 0:
            if item:
                self.db.delete(item)
        elif item:
            item.quantity = quantity
        else:
            self.db.add(m.CartItem(user_id=uid, product_id=pid, quantity=quantity))

    def clear(self, uid):
        self.db.execute(delete(m.CartItem).where(m.CartItem.user_id == uid))


class Wishlist:
    def __init__(self, db):
        self.db = db

    def list(self, uid):
        return list(self.db.scalars(select(m.WishlistItem.product_id).where(m.WishlistItem.user_id == uid)))

    def put(self, uid, pid):
        if self.db.get(m.WishlistItem, (uid, pid)) is None:
            self.db.add(m.WishlistItem(user_id=uid, product_id=pid))

    def remove(self, uid, pid):
        self.db.execute(
            delete(m.WishlistItem).where(m.WishlistItem.user_id == uid, m.WishlistItem.product_id == pid)
        )


class Inventory:
    def __init__(self, db):
        self.db = db

    def reserve(self, pid, quantity):
        return (
            self.db.execute(
                update(m.Product)
                .where(m.Product.id == pid, m.Product.stock >= quantity)
                .values(stock=m.Product.stock - quantity)
            ).rowcount
            == 1
        )

    def release(self, pid, quantity):
        self.db.execute(update(m.Product).where(m.Product.id == pid).values(stock=m.Product.stock + quantity))


class Orders:
    def __init__(self, db):
        self.db = db

    def entity(self, row):
        if row is None:
            return None
        names = dict(
            self.db.execute(
                select(m.Product.id, m.Product.name).where(
                    m.Product.id.in_([x.product_id for x in row.lines])
                )
            ).all()
        )
        return e.Order(
            row.id,
            row.user_id,
            row.total,
            row.status,
            row.created_at,
            row.reservation_expires_at,
            [
                e.Line(x.product_id, x.quantity, x.unit_price, names.get(x.product_id, x.product_id))
                for x in row.lines
            ],
            row.payment_reference,
        )

    def get(self, oid, user_id=None, lock=False):
        q = (
            select(m.Order)
            .options(selectinload(m.Order.lines))
            .where(m.Order.id == oid)
            .execution_options(populate_existing=True)
        )
        if user_id is not None:
            q = q.where(m.Order.user_id == user_id)
        return self.entity(self.db.scalar(q.with_for_update() if lock else q))

    def list(self, uid):
        return [
            self.entity(row)
            for row in self.db.scalars(
                select(m.Order)
                .options(selectinload(m.Order.lines))
                .where(m.Order.user_id == uid)
                .order_by(m.Order.id.desc())
            )
        ]

    def save(self, order):
        row = (
            self.db.get(m.Order, order.id)
            if order.id
            else m.Order(
                user_id=order.user_id,
                created_at=order.created_at,
                lines=[
                    m.OrderLine(product_id=x.product_id, quantity=x.quantity, unit_price=x.unit_price)
                    for x in order.lines
                ],
            )
        )
        row.total, row.status = order.total, order.status
        row.reservation_expires_at, row.payment_reference = (
            order.reservation_expires_at,
            order.payment_reference,
        )
        self.db.add(row)
        self.db.flush()
        order.id = row.id
        return order

    def due(self, now, limit=100):
        return list(
            self.db.scalars(
                select(m.Order.id)
                .where(
                    m.Order.status.in_(["pending", "pending_payment"]), m.Order.reservation_expires_at <= now
                )
                .order_by(m.Order.id)
                .limit(limit)
            )
        )


class Tokens:
    def __init__(self, db):
        self.db = db

    def issue(self, uid, purpose, digest, expires_at, payload=None):
        self.clear(uid, purpose)
        if purpose == "reset":
            self.db.add(m.PasswordReset(user_id=uid, token_hash=digest, expires_at=expires_at))
        else:
            self.db.add(
                m.ActionToken(
                    user_id=uid, token_hash=digest, purpose=purpose, expires_at=expires_at, payload=payload
                )
            )

    def find(self, purpose, digest):
        cls = m.PasswordReset if purpose == "reset" else m.ActionToken
        q = select(cls).where(cls.token_hash == digest)
        if purpose != "reset":
            q = q.where(cls.purpose == purpose)
        row = self.db.scalar(q)
        return None if row is None else (row.user_id, getattr(row, "payload", None))

    def consume(self, purpose, digest, now):
        cls = m.PasswordReset if purpose == "reset" else m.ActionToken
        q = delete(cls).where(cls.token_hash == digest, cls.expires_at > now)
        if purpose != "reset":
            q = q.where(cls.purpose == purpose)
        return self.db.execute(q.returning(cls.user_id)).scalar_one_or_none()

    def clear(self, uid, purpose):
        cls = m.PasswordReset if purpose == "reset" else m.ActionToken
        q = delete(cls).where(cls.user_id == uid)
        if purpose != "reset":
            q = q.where(cls.purpose == purpose)
        self.db.execute(q)


AUDIT_EVENTS = {
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
    "LOGOUT",
    "PASSWORD_CHANGED",
    "PASSWORD_RESET",
    "SESSION_REVOKED",
    "EMAIL_VERIFIED",
    "EMAIL_CHANGED",
    "ORDER_CREATED",
    "ORDER_CANCELLED",
    "ORDER_EXPIRED",
    "PAYMENT_CONFIRMED",
}


class SqlUnitOfWork:
    def __init__(self, engine, cipher):
        self.engine, self.cipher = engine, cipher

    def __enter__(self):
        self.db = Session(self.engine, expire_on_commit=False)
        self.users, self.sessions = Users(self.db), Sessions(self.db)
        self.products, self.inventory = Products(self.db), Inventory(self.db)
        self.cart, self.wishlist = Cart(self.db), Wishlist(self.db)
        self.orders, self.tokens = Orders(self.db), Tokens(self.db)
        return self

    def __exit__(self, typ, value, trace):
        self.db.rollback()
        self.db.close()
        if isinstance(value, IntegrityError):
            raise Conflict() from None

    def commit(self):
        self.db.commit()

    def audit(self, event, user_id=None, subject_id=None):
        if event not in AUDIT_EVENTS:
            raise ValueError("Unsupported audit event")
        self.db.add(
            m.AuditLog(
                event=event, user_id=user_id, subject_id=str(subject_id) if subject_id is not None else None
            )
        )

    def enqueue(self, kind, payload, dedupe_key=None):
        self.db.add(m.Outbox(kind=kind, payload=self.cipher.encrypt(payload), dedupe_key=dedupe_key))

    def job_exists(self, key):
        return self.db.scalar(select(m.Outbox.id).where(m.Outbox.dedupe_key == key)) is not None

    def permitted(self, uid, permission):
        return (
            self.db.scalar(
                select(m.RolePermission.permission)
                .join(m.UserRole, m.UserRole.role == m.RolePermission.role)
                .where(m.UserRole.user_id == uid, m.RolePermission.permission == permission)
                .limit(1)
            )
            is not None
        )

    def subscribe(self, email):
        if not self.db.scalar(select(m.Subscriber.id).where(m.Subscriber.email == email)):
            self.db.add(m.Subscriber(email=email))
