from decimal import Decimal

from conftest import register, write
from sqlalchemy.orm import Session

from app.models import Product
from app.seed import seed


def test_catalog_products_persist_in_cart_and_seed_preserves_inventory(client, engine):
    for category, prefix in (
        ("smartphones", "phone-"), ("laptops", "computer-"),
        ("audio", "audio-"), ("gaming", "gaming-"),
    ):
        response = client.get("/api/products", params={"category": category})
        selected = [p for p in response.json() if p["id"].startswith(prefix)]
        assert len(selected) == 10
        assert all(p["image"].startswith("/assets/products/") for p in selected)

    register(client)
    for pid in ("phone-01", "computer-09", "audio-01", "gaming-01"):
        assert write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 1}).status_code == 204
        assert write(client, "PUT", f"/api/account/wishlist/{pid}").status_code == 204
    assert {item["product"]["id"] for item in client.get("/api/account/cart").json()} == {
        "phone-01", "computer-09", "audio-01", "gaming-01"
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
    assert len(client.get("/api/account/cart").json()) == 4


def test_gaming_photos_replace_only_seed_placeholders(client, engine):
    with Session(engine) as db, db.begin():
        product = db.get(Product, "gaming-01")
        product.price = Decimal("321.50")
        product.stock = 3
        product.payload = {**product.payload, "image": "/assets/products/gaming-01.svg", "description": "Custom description"}
        custom = db.get(Product, "gaming-02")
        custom.payload = {**custom.payload, "image": "/assets/products/custom-console.webp"}
    seed(engine)
    seed(engine)
    with Session(engine) as db:
        product = db.get(Product, "gaming-01")
        assert product.payload["image"] == "/assets/products/gaming-01.webp"
        assert product.payload["description"] == "Custom description"
        assert product.price == Decimal("321.50")
        assert product.stock == 3
        assert db.get(Product, "gaming-02").payload["image"] == "/assets/products/custom-console.webp"
    register(client)
    assert write(client, "PUT", "/api/account/cart/gaming-01", json={"quantity": 1}).status_code == 204
    assert client.get("/api/account/cart").json()[0]["product"]["image"] == "/assets/products/gaming-01.webp"
    assert client.get("/api/products/gaming-01").json()["image"] == "/assets/products/gaming-01.webp"
