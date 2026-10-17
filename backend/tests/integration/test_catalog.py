import json
from decimal import Decimal
from pathlib import Path

import pytest
from conftest import register, write
from sqlalchemy.orm import Session

from app.models import Product
from app.seed import seed


def test_retired_drone_is_hidden_without_deleting_order_history(client, engine):
    from sqlalchemy import select

    from app.models import CartItem, Order, OrderLine, User, WishlistItem

    register(client)
    with Session(engine) as db, db.begin():
        uid = db.scalar(select(User.id))
        db.add(Product(id="drone-10", name="Autel EVO Lite+", name_en="Autel EVO Lite+",
                       category="drones", price=Decimal("1149"), stock=10,
                       payload={"id": "drone-10", "image": "/assets/products/drone-10.svg"}))
        db.flush()
        db.add(CartItem(user_id=uid, product_id="drone-10", quantity=1))
        db.add(WishlistItem(user_id=uid, product_id="drone-10"))
        order = Order(user_id=uid, total=Decimal("1149"), status="paid", lines=[
            OrderLine(product_id="drone-10", quantity=1, unit_price=Decimal("1149"))
        ])
        db.add(order)
        db.flush()
        oid = order.id
    seed(engine)
    assert "drone-10" not in {p["id"] for p in client.get("/api/products").json()}
    assert client.get("/api/products?q=EVO%20Lite").json() == []
    assert client.get("/api/products/drone-10").status_code == 404
    assert write(client, "PUT", "/api/account/cart/drone-10", json={"quantity": 1}).status_code == 404
    assert write(client, "PUT", "/api/account/wishlist/drone-10").status_code == 404
    assert client.get("/api/account/cart").json() == []
    assert client.get("/api/account/wishlist").json() == []
    assert write(client, "POST", "/api/account/orders").status_code == 400
    history = client.get(f"/api/account/orders/{oid}")
    assert history.status_code == 200
    assert history.json()["lines"][0]["productId"] == "drone-10"
    with Session(engine) as db:
        assert db.get(Product, "drone-10").stock == 10
        assert db.get(Order, oid) is not None


def test_catalog_products_persist_in_cart_and_seed_preserves_inventory(client, engine):
    for category, prefix in (
        ("smartphones", "phone-"), ("laptops", "computer-"),
        ("audio", "audio-"), ("gaming", "gaming-"), ("smart-home", "home-"),
        ("wearables", "watch-"),
        ("accessories", "accessory-"),
        ("cameras", "camera-"),
        ("drones", "drone-"),
        ("more", "extra-"),
    ):
        response = client.get("/api/products", params={"category": category})
        selected = [p for p in response.json() if p["id"].startswith(prefix)]
        assert len(selected) == (9 if category == "drones" else 10)
        assert all(p["image"].startswith("/assets/products/") for p in selected)

    register(client)
    for pid in ("phone-01", "computer-09", "audio-01", "gaming-01", "home-01", "watch-01", "accessory-10", "camera-10", "drone-09", "extra-01"):
        assert write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 1}).status_code == 204
        assert write(client, "PUT", f"/api/account/wishlist/{pid}").status_code == 204
    assert {item["product"]["id"] for item in client.get("/api/account/cart").json()} == {
        "phone-01", "computer-09", "audio-01", "gaming-01", "home-01", "watch-01", "accessory-10", "camera-10", "drone-09", "extra-01"
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
    assert len(client.get("/api/account/cart").json()) == 10
    assert "extra-01" in {p["id"] for p in client.get("/api/account/wishlist").json()}
    assert "watch-01" in {p["id"] for p in client.get("/api/account/wishlist").json()}
    assert "accessory-10" in {p["id"] for p in client.get("/api/account/wishlist").json()}
    assert "camera-10" in {p["id"] for p in client.get("/api/account/wishlist").json()}
    assert "drone-09" in {p["id"] for p in client.get("/api/account/wishlist").json()}
    assert {f"camera-{i:02d}" for i in range(1, 11)} <= {
        p["id"] for p in client.get("/api/products").json()
    }


def test_default_catalogue_does_not_truncate_existing_categories(client):
    data_dir = Path(__file__).resolve().parents[2] / "data"
    expected = {
        p["id"] for filename in ("products.json", "catalog-products.json")
        for p in json.loads((data_dir / filename).read_text(encoding="utf-8"))
    }
    assert len(expected) > 100
    response = client.get("/api/products")
    assert response.status_code == 200
    assert {p["id"] for p in response.json()} == expected
    assert len(client.get("/api/products?limit=100").json()) == 100
    # Nine new models plus the existing home-page drone still respect limit=10.
    drones = client.get("/api/products?limit=10&category=drones").json()
    assert len(drones) == 10
    assert "drone-10" not in {p["id"] for p in drones}


@pytest.mark.parametrize("prefix", ["gaming", "phone", "home", "audio", "computer", "watch", "accessory", "camera", "drone", "extra"])
def test_photos_replace_only_seed_placeholders(client, engine, prefix):
    expected_image = client.get(f"/api/products/{prefix}-01").json()["image"]
    assert expected_image.endswith(".webp")
    with Session(engine) as db, db.begin():
        product = db.get(Product, f"{prefix}-01")
        product.price = Decimal("321.50")
        product.stock = 3
        product.payload = {**product.payload, "image": f"/assets/products/{prefix}-01.svg", "description": "Custom description"}
        custom = db.get(Product, f"{prefix}-02")
        custom.payload = {**custom.payload, "image": "/assets/products/custom-console.webp"}
    seed(engine)
    seed(engine)
    with Session(engine) as db:
        product = db.get(Product, f"{prefix}-01")
        assert product.payload["image"] == expected_image
        assert product.payload["description"] == "Custom description"
        assert product.price == Decimal("321.50")
        assert product.stock == 3
        assert db.get(Product, f"{prefix}-02").payload["image"] == "/assets/products/custom-console.webp"
    register(client)
    assert write(client, "PUT", f"/api/account/cart/{prefix}-01", json={"quantity": 1}).status_code == 204
    assert client.get("/api/account/cart").json()[0]["product"]["image"] == expected_image
    assert client.get(f"/api/products/{prefix}-01").json()["image"] == expected_image


@pytest.mark.parametrize("pid", ["phone-02", "phone-04"])
@pytest.mark.parametrize("custom_description", [False, True])
def test_plus_model_correction_preserves_cart_and_merchant_edits(client, engine, pid, custom_description):
    expected = client.get(f"/api/products/{pid}").json()
    register(client)
    assert write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 1}).status_code == 204
    with Session(engine) as db, db.begin():
        product = db.get(Product, pid)
        product.name = product.name.replace("پرو مکس", "پلاس")
        product.name_en = product.name_en.replace("Pro Max", "Plus")
        description = expected["description"].replace("پرو مکس", "پلاس")
        specs = expected["specs"]
        if pid == "phone-04":
            specs = [spec.replace("۴۸", "۱۲") for spec in specs]
            description = description.replace("۴۸", "۱۲")
        product.payload = {
            **product.payload, "name": product.name, "nameEn": product.name_en,
            "specs": specs, "description": "Merchant description" if custom_description else description,
            "image": "/assets/products/custom-phone.webp",
        }
        product.price = Decimal("321.50")
        product.stock = 3
    seed(engine)
    seed(engine)
    actual = client.get(f"/api/products/{pid}").json()
    assert actual["name"] == expected["name"]
    assert actual["nameEn"] == expected["nameEn"]
    assert actual["specs"] == expected["specs"]
    assert actual["description"] == ("Merchant description" if custom_description else expected["description"])
    assert actual["image"] == "/assets/products/custom-phone.webp"
    with Session(engine) as db:
        product = db.get(Product, pid)
        assert product.name == expected["name"]
        assert product.name_en == expected["nameEn"]
        assert product.price == Decimal("321.50")
        assert product.stock == 3
    assert client.get("/api/account/cart").json()[0]["product"]["name"] == expected["name"]
