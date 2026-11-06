"""Management app read models and downloadable documents; same server-side ACLs."""
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.errors import BusinessError
from app.domain.invoices import invoice_data
from app.infrastructure import models as m
from app.infrastructure.audit_exports import spreadsheet, word_document
from app.infrastructure.management import ManagementRepository
from app.infrastructure.rate_limit import enforce
from app.infrastructure.wholesale_pdf import render_invoice
from app.presentation.dependencies import current_user, services

router = APIRouter(prefix="/api/admin", tags=["management app"])


def permit(svc, uid, permission):
    if permission not in svc.management.me(uid)["permissions"]:
        raise BusinessError(403, "مجوز این بخش برای حساب شما فعال نیست.", "FORBIDDEN")


@router.get("/products/filters")
def filters(request: Request, user=Depends(current_user), svc=Depends(services)):
    permit(svc, user.id, "products:read")
    with Session(request.app.state.engine) as db:
        rows = db.execute(select(m.Product.category, m.Product.payload)).all()
        categories, kinds = {}, {}
        for category, payload in rows:
            categories[category] = payload.get("categoryFa") or category
            if payload.get("kindLabel"):
                kinds.setdefault(category, set()).add(payload["kindLabel"])
        return {"categories": [{"id": key, "title": value} for key, value in sorted(categories.items())],
                "kinds": {key: sorted(value) for key, value in kinds.items()}}


@router.get("/products/{pid}")
def product_detail(pid: str, request: Request, user=Depends(current_user), svc=Depends(services)):
    permit(svc, user.id, "products:read")
    with Session(request.app.state.engine) as db:
        product = db.get(m.Product, pid)
        if product is None:
            raise BusinessError(404, "محصول پیدا نشد.")
        return ManagementRepository.product(product)


@router.get("/newsletter-notifications")
def notifications(request: Request, user=Depends(current_user), svc=Depends(services)):
    permit(svc, user.id, "subscribers:read")
    with Session(request.app.state.engine) as db:
        cursor = db.get(m.AdminNotificationRead, user.id)
        seen = cursor.subscriber_id if cursor else 0
        latest = db.scalar(select(func.coalesce(func.max(m.Subscriber.id), 0)))
        unread = db.scalar(select(func.count()).select_from(m.Subscriber).where(m.Subscriber.id > seen))
        rows = db.execute(select(m.Subscriber, m.User.full_name).outerjoin(m.User, m.User.id == m.Subscriber.user_id)
                          .order_by(m.Subscriber.id.desc()).limit(30)).all()
        return {"unread": unread, "latestId": latest, "items": [
            {"id": row.id, "email": row.email, "name": name or "", "userId": row.user_id,
             "createdAt": row.created_at, "unread": row.id > seen} for row, name in rows]}


class ReadNotifications(BaseModel):
    throughId: int = Field(ge=0)


@router.post("/newsletter-notifications/read", status_code=204)
def mark_read(body: ReadNotifications, request: Request, user=Depends(current_user), svc=Depends(services)):
    permit(svc, user.id, "subscribers:read")
    with Session(request.app.state.engine) as db, db.begin():
        db.scalar(select(m.User.id).where(m.User.id == user.id).with_for_update())
        cursor = db.get(m.AdminNotificationRead, user.id)
        latest = db.scalar(select(func.coalesce(func.max(m.Subscriber.id), 0)))
        value = min(body.throughId, latest)
        if cursor is None:
            db.add(m.AdminNotificationRead(user_id=user.id, subscriber_id=value))
        else:
            cursor.subscriber_id = max(cursor.subscriber_id, value)
    return Response(status_code=204)


@router.get("/audit/export")
def export_audit(request: Request, format: Literal["xlsx", "docx"] = "xlsx",
                 event: str = Query('', max_length=64), since: datetime | None = None, until: datetime | None = None,
                 user=Depends(current_user), svc=Depends(services)):
    permit(svc, user.id, "audit:read")
    enforce(request, "audit_export", str(user.id))
    with Session(request.app.state.engine) as db:
        query = select(m.AuditLog, m.User).outerjoin(m.User, m.User.id == m.AuditLog.user_id)
        if event:
            query = query.where(m.AuditLog.event == event)
        if since:
            query = query.where(m.AuditLog.created_at >= since)
        if until:
            query = query.where(m.AuditLog.created_at <= until)
        records = db.execute(query.order_by(m.AuditLog.id.desc()).limit(10001)).all()
        if len(records) > 10000:
            raise BusinessError(413, "گزارش بیش از ۱۰۰۰۰ رویداد دارد؛ بازهٔ تاریخ یا نوع رویداد را محدود کنید.")
        rows = [[row.id, row.event, row.created_at.isoformat(), person.full_name if person else '',
                 person.email if person else '', row.user_id, row.subject_id] for row, person in records]
    raw = spreadsheet(rows) if format == "xlsx" else word_document(rows)
    content_type = ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if format == "xlsx"
                    else "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    return Response(raw, media_type=content_type,
                    headers={"Content-Disposition": f'attachment; filename="Nexora-audit.{format}"', "Cache-Control": "no-store"})


@router.get("/orders/{oid}/invoice.pdf")
def invoice_pdf(oid: int, user=Depends(current_user), svc=Depends(services)):
    order = svc.orders.document(user.id, oid, admin=True)
    data = invoice_data(order)
    addr = data["shippingAddress"] or {}
    address = "، ".join(str(addr.get(key) or '') for key in ['province', 'city', 'address', 'building', 'unit'] if addr.get(key))
    status = {"paid": "پرداخت شده", "cancelled": "لغو شده", "expired": "منقضی شده"}.get(data["status"], "در انتظار پرداخت")
    raw = render_invoice({
        "title": "فاکتور فروشگاه نکسورا", "identifierLabel": "شماره فاکتور", "trackingCode": str(oid),
        "approvedAt": data["createdAt"].isoformat(),
        "customer": {"name": addr.get("recipient"), "phone": addr.get("phone"), "city": addr.get("city"),
                     "address": address, "postalCode": addr.get("postalCode"), "email": data["email"]},
        "lines": data["lines"], "subtotalRial": data["subtotalRial"], "shippingRial": data["shippingRial"],
        "totalRial": data["totalRial"], "shippingLabel": "هزینه ارسال", "terms": "وضعیت سفارش: " + status + "\nتوضیحات تحویل: " + str(addr.get("notes") or '—')
            + ("\nتاریخ پرداخت: " + data["paidAt"].isoformat() if data["paidAt"] else '')
            + ("\nمرجع پرداخت: " + order.payment_reference if order.payment_reference else ''),
        "footer": "وضعیت پرداخت: " + status,
        "notice": "مبالغ براساس اطلاعات ثبت‌شدهٔ سفارش و به ریال هستند. این سند به‌تنهایی رسید پرداخت یا فاکتور رسمی مالیاتی نیست.",
    })
    return Response(raw, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="Nexora-order-{oid}.pdf"'})
