from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models import CartItem, Order, OrderLine, Product, User, WishlistItem
from app.routers.catalog import public_product
from app.schemas import AccountOutput, OrderHistoryOutput, OrderOutput, ProfileUpdate, QuantityInput
from app.security import current_user

router = APIRouter(prefix="/api/account", tags=["account"])


@router.patch("/profile", response_model=AccountOutput)
def update_profile(data: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)):
    user.full_name = data.full_name
    db.commit()
    return user


@router.get("/orders/{order_id}")
def order_detail(order_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    order = db.scalar(select(Order).where(Order.id == order_id, Order.user_id == user.id))
    if order is None:
        raise HTTPException(404, "Order not found")
    rows = db.execute(
        select(OrderLine, Product.name).join(Product).where(OrderLine.order_id == order.id)
    ).all()
    subtotal = sum((line.unit_price * line.quantity for line, name in rows), Decimal("0"))
    return {
        "id": order.id,
        "total": float(order.total),
        "status": order.status,
        "createdAt": order.created_at,
        "shipping": float(order.total - subtotal),
        "lines": [
            {
                "productId": line.product_id,
                "name": name,
                "quantity": line.quantity,
                "unitPrice": float(line.unit_price),
            }
            for line, name in rows
        ],
    }


def lock_account(db: Session, user: User):
    # Serialize cart/wishlist/order changes for one user across workers.
    db.execute(select(User.id).where(User.id == user.id).with_for_update()).one()


@router.get("/cart")
def cart(db: Session = Depends(get_db), user: User = Depends(current_user)):
    items = db.scalars(
        select(CartItem).options(joinedload(CartItem.product)).where(CartItem.user_id == user.id)
    )
    return [{"product": public_product(item.product), "quantity": item.quantity} for item in items]


@router.put("/cart/{product_id}", status_code=204)
def put_cart(
    product_id: str, data: QuantityInput, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    lock_account(db, user)
    item = db.get(CartItem, (user.id, product_id))
    if data.quantity == 0:
        if item:
            db.delete(item)
    else:
        product = db.get(Product, product_id)
        if product is None:
            raise HTTPException(404, "Product not found")
        if product.stock < data.quantity:
            raise HTTPException(409, "Insufficient stock")
        if item:
            item.quantity = data.quantity
        else:
            db.add(CartItem(user_id=user.id, product_id=product_id, quantity=data.quantity))
    db.commit()
    return Response(status_code=204)


@router.delete("/cart", status_code=204)
def clear_cart(db: Session = Depends(get_db), user: User = Depends(current_user)):
    lock_account(db, user)
    db.execute(delete(CartItem).where(CartItem.user_id == user.id))
    db.commit()
    return Response(status_code=204)


@router.get("/wishlist")
def wishlist(db: Session = Depends(get_db), user: User = Depends(current_user)):
    query = select(Product).join(WishlistItem).where(WishlistItem.user_id == user.id)
    return [public_product(product) for product in db.scalars(query)]


@router.put("/wishlist/{product_id}", status_code=204)
def put_wishlist(product_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    lock_account(db, user)
    if db.get(Product, product_id) is None:
        raise HTTPException(404, "Product not found")
    if db.get(WishlistItem, (user.id, product_id)) is None:
        db.add(WishlistItem(user_id=user.id, product_id=product_id))
    db.commit()
    return Response(status_code=204)


@router.delete("/wishlist/{product_id}", status_code=204)
def delete_wishlist(product_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    lock_account(db, user)
    db.execute(
        delete(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.product_id == product_id)
    )
    db.commit()
    return Response(status_code=204)


@router.post("/orders", response_model=OrderOutput)
def create_order(db: Session = Depends(get_db), user: User = Depends(current_user)):
    lock_account(db, user)
    items = list(
        db.scalars(select(CartItem).where(CartItem.user_id == user.id).order_by(CartItem.product_id))
    )
    if not items:
        raise HTTPException(400, "Cart is empty")
    subtotal = Decimal("0")
    lines = []
    for item in items:
        # Atomic stock reservation also protects competing orders from other users.
        price = db.scalar(
            update(Product)
            .where(Product.id == item.product_id, Product.stock >= item.quantity)
            .values(stock=Product.stock - item.quantity)
            .returning(Product.price)
        )
        if price is None:
            raise HTTPException(409, "Product unavailable or insufficient stock")
        subtotal += price * item.quantity
        lines.append(OrderLine(product_id=item.product_id, quantity=item.quantity, unit_price=price))
    order = Order(
        user_id=user.id, total=subtotal + (Decimal("0") if subtotal >= 99 else Decimal("9.99")), lines=lines
    )
    db.add(order)
    db.execute(delete(CartItem).where(CartItem.user_id == user.id))
    db.commit()
    return order


@router.get("/orders", response_model=list[OrderHistoryOutput])
def orders(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return list(db.scalars(select(Order).where(Order.user_id == user.id).order_by(Order.id.desc())))
