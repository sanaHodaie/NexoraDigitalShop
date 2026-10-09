from decimal import Decimal

from conftest import register, write
from sqlalchemy.orm import Session

from app.models import Product
from app.seed import seed


def test_catalog_products_persist_in_cart_and_seed_preserves_inventory(client, engine):
    for category, prefix in (("smartphones", "phone-"), ("laptops", "computer-")):
        response = client.get("/api/products", params={"category": category})
        selected = [p for p in response.json() if p["id"].startswith(prefix)]
        assert len(selected) == 10
        assert all(p["image"].startswith("/assets/products/") for p in selected)

    register(client)
    for pid in ("phone-01", "computer-09"):
        assert write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 1}).status_code == 204
        assert write(client, "PUT", f"/api/account/wishlist/{pid}").status_code == 204
    assert {item["product"]["id"] for item in client.get("/api/account/cart").json()} == {
        "phone-01", "computer-09"
    }
    with Session(engine) as db, db.begin():
        product = db.get(Product, "phone-01")
        product.price = Decimal("731.25")
        product.stock = 7
    seed(engine)
    seed(engine)
    with Session(engine) as db:
        product = db.get(Product, "phone-01")
        assert product.price == Decimal("731.25")
        assert product.stock == 7
    assert len(client.get("/api/account/cart").json()) == 2
