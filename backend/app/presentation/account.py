from fastapi import APIRouter, Depends, Request, Response

from app.infrastructure.rate_limit import enforce
from app.presentation.dependencies import current_user, services, session_cookie
from app.presentation.schemas import (
    AccountOutput,
    EmailChange,
    OrderHistoryOutput,
    OrderOutput,
    PasswordChange,
    PaymentInput,
    ProfileUpdate,
    QuantityInput,
)

router = APIRouter(prefix="/api", tags=["account"])


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
def create_order(user=Depends(current_user), svc=Depends(services)):
    return svc.orders.create(user.id)


@router.get("/account/orders", response_model=list[OrderHistoryOutput])
def orders(user=Depends(current_user), svc=Depends(services)):
    return svc.orders.list(user.id)


@router.get("/account/orders/{oid}")
def order(oid: int, user=Depends(current_user), svc=Depends(services)):
    item = svc.orders.get(user.id, oid)
    return {
        **OrderHistoryOutput.model_validate(item).model_dump(by_alias=True),
        "shipping": float(item.shipping),
        "lines": [
            {
                "productId": line.product_id,
                "name": line.name,
                "quantity": line.quantity,
                "unitPrice": float(line.unit_price),
            }
            for line in item.lines
        ],
    }


@router.post("/account/orders/{oid}/cancel", response_model=OrderOutput)
def cancel_order(oid: int, user=Depends(current_user), svc=Depends(services)):
    return svc.orders.cancel(user.id, oid)


@router.post("/management/orders/{oid}/confirm-payment", response_model=OrderOutput)
def confirm_payment(oid: int, data: PaymentInput, user=Depends(current_user), svc=Depends(services)):
    return svc.orders.confirm_payment(user.id, oid, data.reference)
