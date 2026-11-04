from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.errors import BusinessError
from app.infrastructure.models import AuditLog, CustomerRequest, utcnow


def output(row, admin=False):
    data = {
        "id": row.id,
        "kind": row.kind,
        "status": row.status,
        "createdAt": row.created_at.isoformat(),
        "updatedAt": row.updated_at.isoformat(),
    }
    if admin:
        data.update(
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
                .where(CustomerRequest.telegram_user_id == uid)
                .order_by(CustomerRequest.id.desc())
                .limit(20)
            )
            return {"items": [output(row) for row in rows]}

    def list(self, page, status=None, kind=None):
        with Session(self.engine) as db:
            query = select(CustomerRequest)
            if status:
                query = query.where(CustomerRequest.status == status)
            if kind:
                query = query.where(CustomerRequest.kind == kind)
            total = db.scalar(select(func.count()).select_from(query.subquery()))
            rows = db.scalars(query.order_by(CustomerRequest.id.desc()).offset((page - 1) * 20).limit(20))
            return {"items": [output(row, True) for row in rows], "total": total, "page": page, "size": 20}

    def update(self, rid, actor, status, note, version):
        with Session(self.engine) as db, db.begin():
            row = db.scalar(select(CustomerRequest).where(CustomerRequest.id == rid).with_for_update())
            if row is None:
                raise BusinessError(404, "درخواست پیدا نشد.")
            if row.version != version:
                raise BusinessError(409, "این درخواست تغییر کرده است؛ اطلاعات را تازه کنید.")
            row.status, row.staff_note = status, note
            row.updated_at, row.version = utcnow(), row.version + 1
            db.add(AuditLog(event="customer_request_updated", user_id=actor, subject_id=str(row.id)))
            return output(row, True)
