from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Product, Subscriber
from app.schemas import EmailInput

router = APIRouter(prefix="/api", tags=["catalog"])


def public_product(product: Product) -> dict:
    return {**product.payload, "price": float(product.price), "inStock": product.stock > 0}


@router.get("/products")
def products(
    q: str | None = None, category: str | None = None, limit: int = 100, db: Session = Depends(get_db)
):
    query = select(Product)
    if q and q.strip():
        term = q.strip()
        if len(term) > 100:
            raise HTTPException(400, "Search too long")
        query = query.where(
            or_(Product.name.contains(term, autoescape=True), Product.name_en.contains(term, autoescape=True))
        )
    if category and category.strip():
        query = query.where(Product.category == category)
    return [public_product(p) for p in db.scalars(query.order_by(Product.id).limit(max(1, min(limit, 100))))]


@router.get("/products/{product_id}")
def product(product_id: str, db: Session = Depends(get_db)):
    item = db.get(Product, product_id)
    if item is None:
        raise HTTPException(404, "Product not found")
    return public_product(item)


@router.post("/newsletter", status_code=202)
def newsletter(data: EmailInput, db: Session = Depends(get_db)):
    if not db.scalar(select(Subscriber).where(Subscriber.email == data.email)):
        db.add(Subscriber(email=data.email))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    return Response(status_code=202)
