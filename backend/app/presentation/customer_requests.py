from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field

from app.domain.errors import BusinessError
from app.infrastructure.customer_requests import CustomerRequests
from app.infrastructure.rate_limit import enforce
from app.presentation.dependencies import current_user, services
from app.presentation.telegram import bot_auth

router = APIRouter(tags=["customer requests"])
Status = Literal["new", "reviewing", "contacted", "quoted", "closed", "cancelled", "approved"]
Kind = Literal["wholesale", "support"]


class Details(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^\+?[0-9]{8,15}$")
    company: str = Field(default="", max_length=150)
    items: str = Field(min_length=2, max_length=2000)
    quantity: int = Field(ge=1, le=1000000)
    city: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=5, max_length=600)
    notes: str = Field(default="", max_length=2000)


class Create(BaseModel):
    request_key: UUID
    telegram_user_id: int = Field(strict=True, gt=0, le=2**52 - 1)
    telegram_username: str = Field(default="", max_length=64)
    kind: Kind
    details: Details


class Update(BaseModel):
    status: Status
    staffNote: str = Field(default="", max_length=2000)
    version: int = Field(ge=1)


def storage(request: Request):
    return CustomerRequests(request.app.state.engine)


@router.post("/internal/telegram/customer-requests", dependencies=[Depends(bot_auth)])
def create(data: Create, request: Request, store=Depends(storage)):
    enforce(request, "customer_request", str(data.telegram_user_id))
    return store.create(
        str(data.request_key),
        data.telegram_user_id,
        data.telegram_username,
        data.kind,
        data.details.model_dump(),
    )


@router.get("/internal/telegram/customer-requests/health", dependencies=[Depends(bot_auth)])
def service_health(request: Request):
    from sqlalchemy import select, text

    from app.infrastructure.models import CustomerDelivery, CustomerRequest

    with request.app.state.engine.connect() as connection:
        connection.execute(
            select(CustomerRequest.id, CustomerRequest.tracking_code, CustomerRequest.invoice_pdf).limit(0)
        )
        connection.execute(select(CustomerDelivery.request_id).limit(0))
        if connection.dialect.name == "postgresql":
            allowed = connection.scalar(
                text(
                    "SELECT has_table_privilege(current_user, 'customer_requests', 'INSERT') AND has_table_privilege(current_user, 'customer_requests', 'UPDATE') AND has_table_privilege(current_user, 'customer_deliveries', 'INSERT')"
                )
            )
            if not allowed:
                raise BusinessError(503, "CUSTOMER_REQUEST_GRANTS_REQUIRED")
    return {
        "status": "ready",
        "notificationsConfigured": bool(
            request.app.state.settings.telegram_bot_token
            and request.app.state.settings.telegram_bot_token.get_secret_value().strip()
        ),
    }


@router.get("/internal/telegram/customer-requests/{uid}", dependencies=[Depends(bot_auth)])
def mine(uid: int, store=Depends(storage)):
    return store.mine(uid)


def permission(svc, uid, needed):
    if needed not in svc.management.me(uid)["permissions"]:
        raise BusinessError(403, "دسترسی رسیدگی به سفارش‌ها لازم است.")


@router.get("/api/admin/customer-requests")
def listing(
    page: int = Query(1, ge=1, le=100000),
    status: Status | None = None,
    kind: Kind | None = None,
    user=Depends(current_user),
    svc=Depends(services),
    store=Depends(storage),
):
    permission(svc, user.id, "orders:read")
    return store.list(page, status, kind)


@router.patch("/api/admin/customer-requests/{rid}")
def update(rid: int, data: Update, user=Depends(current_user), svc=Depends(services), store=Depends(storage)):
    permission(svc, user.id, "orders:cancel")
    if data.status == "approved":
        raise BusinessError(400, "تأیید فقط با صدور فاکتور انجام می‌شود.")
    return store.update(rid, user.id, data.status, data.staffNote, data.version)


class InvoiceLine(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    quantity: int = Field(strict=True, ge=1, le=1000000)
    unitPriceRial: int = Field(strict=True, gt=0, le=10**12)


class Approval(BaseModel):
    version: int = Field(ge=1)
    lines: list[InvoiceLine] = Field(min_length=1, max_length=50)
    shippingRial: int = Field(default=0, strict=True, ge=0, le=10**12)
    terms: str = Field(default="", max_length=1000)


@router.post("/api/admin/customer-requests/{rid}/approve")
def approve(
    rid: int,
    data: Approval,
    request: Request,
    user=Depends(current_user),
    svc=Depends(services),
    store=Depends(storage),
):
    permission(svc, user.id, "orders:confirm_payment")
    token = request.app.state.settings.telegram_bot_token
    if not token or not token.get_secret_value().strip():
        raise BusinessError(503, "برای ارسال فاکتور، TELEGRAM_BOT_TOKEN را در تنظیمات امن بک‌اند وارد کنید.")
    return store.approve(
        rid, user.id, data.version, [line.model_dump() for line in data.lines], data.shippingRial, data.terms
    )


def pdf_response(store, rid, uid=None):
    from fastapi import Response

    data, code = store.pdf(rid, uid)
    return Response(
        data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="Nexora-' + code + '.pdf"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/api/admin/customer-requests/{rid}/invoice")
def invoice(rid: int, user=Depends(current_user), svc=Depends(services), store=Depends(storage)):
    permission(svc, user.id, "orders:read")
    return pdf_response(store, rid)


@router.get("/internal/telegram/customer-requests/{uid}/{rid}/invoice", dependencies=[Depends(bot_auth)])
def customer_invoice(uid: int, rid: int, store=Depends(storage)):
    return pdf_response(store, rid, uid)


@router.post("/api/admin/customer-requests/{rid}/retry-delivery")
def retry_delivery(rid: int, user=Depends(current_user), svc=Depends(services), store=Depends(storage)):
    permission(svc, user.id, "orders:confirm_payment")
    return store.retry(rid, user.id)


@router.get("/api/admin/customer-request-stats")
def statistics(user=Depends(current_user), svc=Depends(services), store=Depends(storage)):
    permission(svc, user.id, "orders:read")
    return store.stats()
