from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field

from app.infrastructure.rate_limit import enforce
from app.presentation.dependencies import current_user, services, session_cookie
from app.presentation.schemas import (
    AccountOutput,
    CheckoutInput,
    EmailChange,
    OrderHistoryOutput,
    OrderOutput,
    PasswordChange,
    PaymentInput,
    ProfileUpdate,
    QuantityInput,
)

router = APIRouter(prefix="/api", tags=["account"])


class SubmitInvoiceInput(BaseModel):
    priceRevision: str = Field(pattern=r'^[a-f0-9]{64}$')


@router.post("/account/password", status_code=204)
def password(data: PasswordChange, request: Request, user=Depends(current_user), svc=Depends(services)):
    enforce(request, "password_change", str(user.id))
    token = svc.identity.change_password(user.id, data.current_password, data.new_password)
    response = Response(status_code=204)
    session_cookie(request, response, token)
    return response


@router.post("/account/email", status_code=202)
def email(data: EmailChange, request: Request, user=Depends(current_user), svc=Depends(services)):
    enforce(request, "email_change_request", str(user.id))
    return svc.identity.change_email(user.id, data.current_password, data.email)


@router.get("/account/profile", response_model=AccountOutput)
def profile(user=Depends(current_user), svc=Depends(services)):
    return svc.identity.profile(user.id)


@router.patch("/account/profile", response_model=AccountOutput)
def update_profile(data: ProfileUpdate, user=Depends(current_user), svc=Depends(services)):
    return svc.identity.profile(user.id, data.full_name)


@router.get("/account/cart")
def cart(user=Depends(current_user), svc=Depends(services)):
    return svc.shopping.cart(user.id)


@router.put("/account/cart/{pid}", status_code=204)
def put_cart(pid: str, data: QuantityInput, user=Depends(current_user), svc=Depends(services)):
    svc.shopping.put_cart(user.id, pid, data.quantity)
    return Response(status_code=204)


@router.delete("/account/cart", status_code=204)
def clear_cart(user=Depends(current_user), svc=Depends(services)):
    svc.shopping.clear_cart(user.id)
    return Response(status_code=204)


@router.get("/account/wishlist")
def wishlist(user=Depends(current_user), svc=Depends(services)):
    return svc.shopping.wishlist(user.id)


@router.put("/account/wishlist/{pid}", status_code=204)
def put_wishlist(pid: str, user=Depends(current_user), svc=Depends(services)):
    svc.shopping.put_wishlist(user.id, pid)
    return Response(status_code=204)


@router.delete("/account/wishlist/{pid}", status_code=204)
def delete_wishlist(pid: str, user=Depends(current_user), svc=Depends(services)):
    svc.shopping.remove_wishlist(user.id, pid)
    return Response(status_code=204)


@router.post("/account/orders", response_model=OrderOutput)
def create_order(data: CheckoutInput, user=Depends(current_user), svc=Depends(services)):
    return svc.orders.create(user.id, data.shippingAddress.model_dump())


@router.post("/account/invoices", response_model=OrderOutput)
def draft_invoice(data: CheckoutInput, request: Request, user=Depends(current_user), svc=Depends(services)):
    enforce(request, "invoice_draft", str(user.id))
    return svc.orders.create(user.id, data.shippingAddress.model_dump(), draft=True)


@router.post("/account/orders/{oid}/submit", response_model=OrderOutput)
def submit_order(oid: int, data: SubmitInvoiceInput | None = None, user=Depends(current_user), svc=Depends(services)):
    return svc.orders.submit(user.id, oid, data.priceRevision if data else None)


@router.post('/account/orders/{oid}/refresh-draft')
def refresh_draft(oid: int, user=Depends(current_user), svc=Depends(services)):
    from app.domain.invoices import invoice_data
    return invoice_data(svc.orders.refresh_draft(user.id, oid))


@router.get("/account/orders/{oid}/invoice")
def download_invoice(oid: int, download: bool = True, user=Depends(current_user), svc=Depends(services)):
    from app.infrastructure.invoice_documents import document_response

    return document_response(svc.orders.document(user.id, oid), download=download)


@router.get("/account/orders", response_model=list[OrderHistoryOutput])
def orders(user=Depends(current_user), svc=Depends(services)):
    return svc.orders.list(user.id)


@router.get("/account/orders/{oid}")
def order(oid: int, user=Depends(current_user), svc=Depends(services)):
    from app.domain.invoices import invoice_data

    return invoice_data(svc.orders.get(user.id, oid))


@router.post("/account/orders/{oid}/cancel", response_model=OrderOutput)
def cancel_order(oid: int, user=Depends(current_user), svc=Depends(services)):
    return svc.orders.cancel(user.id, oid)


@router.post("/management/orders/{oid}/confirm-payment", response_model=OrderOutput)
def confirm_payment(oid: int, data: PaymentInput, user=Depends(current_user), svc=Depends(services)):
    return svc.orders.confirm_payment(user.id, oid, data.reference)
