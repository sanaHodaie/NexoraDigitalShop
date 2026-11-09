import secrets
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, defer

from app.domain.errors import BusinessError
from app.infrastructure.management import search_column, search_text
from app.infrastructure.models import AuditLog, CustomerDelivery, CustomerRequest, utcnow
from app.infrastructure.wholesale_pdf import render_invoice


def output(row, admin=False):
    data = {
        "id": row.id,
        "kind": row.kind,
        "status": row.status,
        "createdAt": row.created_at.isoformat(),
        "updatedAt": row.updated_at.isoformat(),
        "trackingCode": row.tracking_code,
        "hasInvoice": row.approved_at is not None,
    }
    if admin:
        data.update(
            invoice=row.invoice_data,
            details=row.details,
            telegramUserId=str(row.telegram_user_id),
            telegramUsername=row.telegram_username,
            staffNote=row.staff_note,
            version=row.version,
        )
    return data


class CustomerRequests:
    def __init__(self, engine):
        self.engine = engine

    def create(self, key, uid, username, kind, details):
        def replay(db):
            row = db.scalar(select(CustomerRequest).where(CustomerRequest.request_key == key))
            if row is not None:
                if row.telegram_user_id != uid or row.kind != kind or row.details != details:
                    raise BusinessError(409, "شناسه درخواست قبلاً استفاده شده است.")
                return output(row)

        try:
            with Session(self.engine) as db, db.begin():
                saved = replay(db)
                if saved:
                    return saved
                row = CustomerRequest(
                    request_key=key,
                    telegram_user_id=uid,
                    telegram_username=username,
                    kind=kind,
                    details=details,
                    status="new",
                    staff_note="",
                    version=1,
                )
                db.add(row)
                db.flush()
                db.add(AuditLog(event="customer_request_created", subject_id=str(row.id)))
                return output(row)
        except IntegrityError:
            with Session(self.engine) as db:
                saved = replay(db)
                if saved:
                    return saved
            raise

    def mine(self, uid):
        with Session(self.engine) as db:
            rows = db.scalars(
                select(CustomerRequest)
                .options(defer(CustomerRequest.invoice_pdf))
                .where(CustomerRequest.telegram_user_id == uid)
                .order_by(CustomerRequest.id.desc())
                .limit(20)
            )
            return {"items": [output(row) for row in rows]}

    def list(self, page, status=None, kind=None, size=20, query=''):
        search = query
        with Session(self.engine) as db:
            query = select(CustomerRequest).options(defer(CustomerRequest.invoice_pdf))
            if status:
                query = query.where(CustomerRequest.status == status)
            if kind:
                query = query.where(CustomerRequest.kind == kind)
            for token in search_text(search).split()[:12]:
                query = query.where(or_(search_column(CustomerRequest.details['name'].as_string()).contains(token, autoescape=True),
                                        search_column(CustomerRequest.details['phone'].as_string()).contains(token, autoescape=True),
                                        search_column(CustomerRequest.details['items'].as_string()).contains(token, autoescape=True),
                                        CustomerRequest.tracking_code.contains(token, autoescape=True),
                                        cast(CustomerRequest.id, String).contains(token, autoescape=True)))
            total = db.scalar(select(func.count()).select_from(query.subquery()))
            rows = db.scalars(query.order_by(CustomerRequest.id.desc()).offset((page - 1) * size).limit(size))
            items = []
            for row in rows:
                item = output(row, True)
                delivery = db.get(CustomerDelivery, row.id)
                item["deliveryStatus"] = (
                    "sent"
                    if delivery and delivery.sent_at
                    else "failed"
                    if delivery and delivery.failed_at
                    else "pending"
                    if delivery
                    else "none"
                )
                items.append(item)
            return {"items": items, "total": total, "page": page, "size": size}

    def update(self, rid, actor, status, note, version):
        with Session(self.engine) as db, db.begin():
            row = db.scalar(select(CustomerRequest).where(CustomerRequest.id == rid).with_for_update())
            if row is None:
                raise BusinessError(404, "درخواست پیدا نشد.")
            if row.approved_at is not None and status != "approved":
                raise BusinessError(409, "فاکتور تأییدشده تغییرپذیر نیست؛ برای اصلاح با مشتری هماهنگ کنید.")
            if row.version != version:
                raise BusinessError(409, "این درخواست تغییر کرده است؛ اطلاعات را تازه کنید.")
            row.status, row.staff_note = status, note
            row.updated_at, row.version = utcnow(), row.version + 1
            db.add(AuditLog(event="customer_request_updated", user_id=actor, subject_id=str(row.id)))
            return output(row, True)

    def detail(self, rid):
        with Session(self.engine) as db:
            row = db.scalar(select(CustomerRequest).options(defer(CustomerRequest.invoice_pdf))
                            .where(CustomerRequest.id == rid))
            if row is None:
                raise BusinessError(404, "درخواست پیدا نشد.")
            item = output(row, True)
            delivery = db.get(CustomerDelivery, rid)
            item["deliveryStatus"] = ("sent" if delivery and delivery.sent_at else
                                      "failed" if delivery and delivery.failed_at else
                                      "pending" if delivery else "none")
            return item

    def approve(self, rid, actor, version, lines, shipping, terms):
        with Session(self.engine) as db, db.begin():
            row = db.scalar(select(CustomerRequest).where(CustomerRequest.id == rid).with_for_update())
            if row is None:
                raise BusinessError(404, "درخواست پیدا نشد.")
            if row.approved_at is not None:
                return output(row, True)
            if row.kind != "wholesale" or row.status in ("cancelled", "closed"):
                raise BusinessError(409, "این درخواست قابل تأیید خرید عمده نیست.")
            if row.version != version:
                raise BusinessError(409, "اطلاعات تغییر کرده است؛ تازه‌سازی کنید.")
            for attempt in range(20):
                try:
                    with db.begin_nested():
                        row.tracking_code = str(10000000 + secrets.randbelow(90000000))
                        db.flush()
                    break
                except IntegrityError:
                    continue
            else:
                raise BusinessError(503, "ساخت کد رهگیری ممکن نشد؛ دوباره تلاش کنید.")
            now = utcnow()
            entries = [
                {
                    "name": line["name"],
                    "quantity": line["quantity"],
                    "unitPriceRial": str(line["unitPriceRial"]),
                    "totalRial": str(line["quantity"] * line["unitPriceRial"]),
                }
                for line in lines
            ]
            subtotal = sum(int(line["totalRial"]) for line in entries)
            data = {
                "trackingCode": row.tracking_code,
                "approvedAt": now.isoformat(),
                "customer": row.details,
                "lines": entries,
                "subtotalRial": str(subtotal),
                "shippingRial": str(shipping),
                "totalRial": str(subtotal + int(shipping)),
                "terms": terms,
            }
            row.invoice_data = data
            row.invoice_pdf = render_invoice(data)
            row.approved_at = now
            row.updated_at = now
            row.status = "approved"
            row.version += 1
            db.add(CustomerDelivery(request_id=row.id, attempts=0, available_at=now))
            db.add(AuditLog(event="wholesale_approved", user_id=actor, subject_id=str(row.id)))
            return output(row, True)

    def pdf(self, rid, uid=None):
        with Session(self.engine) as db:
            row = db.get(CustomerRequest, rid)
            if row is None or (uid is not None and row.telegram_user_id != uid) or row.invoice_pdf is None:
                raise BusinessError(404, "فاکتور پیدا نشد.")
            return bytes(row.invoice_pdf), row.tracking_code

    def retry(self, rid, actor):
        with Session(self.engine) as db, db.begin():
            row = db.scalar(
                select(CustomerDelivery).where(CustomerDelivery.request_id == rid).with_for_update()
            )
            if row is None:
                raise BusinessError(404, "ارسالی برای این درخواست ثبت نشده است.")
            if row.sent_at is not None:
                raise BusinessError(409, "فاکتور قبلاً ارسال شده است.")
            if row.locked_until and row.locked_until > utcnow():
                raise BusinessError(409, "ارسال در حال انجام است.")
            row.failed_at = None
            row.available_at = utcnow()
            row.attempts = 0
            db.add(AuditLog(event="wholesale_delivery_retry", user_id=actor, subject_id=str(rid)))
            return {"status": "pending"}

    def stats(self):
        today = datetime.now(ZoneInfo("Asia/Tehran")).date()
        since = datetime.combine(today - timedelta(days=29), time.min, tzinfo=ZoneInfo("Asia/Tehran"))
        with Session(self.engine) as db:
            day = (
                func.date(func.timezone("Asia/Tehran", CustomerRequest.created_at))
                if self.engine.dialect.name == "postgresql"
                else func.date(CustomerRequest.created_at, "+3 hours", "+30 minutes")
            )
            rows = db.execute(
                select(day, func.count()).where(CustomerRequest.created_at >= since).group_by(day)
            ).all()
            counts = {str(day): count for day, count in rows}
            daily = [
                {
                    "day": (today - timedelta(days=i)).isoformat(),
                    "requests": counts.get(str(today - timedelta(days=i)), 0),
                }
                for i in range(29, -1, -1)
            ]
            statuses = dict(
                db.execute(
                    select(CustomerRequest.status, func.count()).group_by(CustomerRequest.status)
                ).all()
            )
            return {"daily": daily, "statuses": statuses, "total": sum(statuses.values())}
