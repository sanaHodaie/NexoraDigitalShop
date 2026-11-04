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
Status = Literal["new", "reviewing", "contacted", "quoted", "closed", "cancelled"]
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
    return store.update(rid, user.id, data.status, data.staffNote, data.version)
