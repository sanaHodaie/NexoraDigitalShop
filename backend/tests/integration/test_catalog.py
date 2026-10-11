from decimal import Decimal

import pytest
from conftest import register, write
from sqlalchemy.orm import Session

from app.models import Product
from app.seed import seed


def test_catalog_products_persist_in_cart_and_seed_preserves_inventory(client, engine):
    for category, prefix in (
        ("smartphones", "phone-"), ("laptops", "computer-"),
        ("audio", "audio-"), ("gaming", "gaming-"), ("smart-home", "home-"),
    ):
        response = client.get("/api/products", params={"category": category})
        selected = [p for p in response.json() if p["id"].startswith(prefix)]
        assert len(selected) == 10
        assert all(p["image"].startswith("/assets/products/") for p in selected)

    register(client)
    for pid in ("phone-01", "computer-09", "audio-01", "gaming-01", "home-01"):
        assert write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 1}).status_code == 204
        assert write(client, "PUT", f"/api/account/wishlist/{pid}").status_code == 204
    assert {item["product"]["id"] for item in client.get("/api/account/cart").json()} == {
        "phone-01", "computer-09", "audio-01", "gaming-01", "home-01"
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
    assert len(client.get("/api/account/cart").json()) == 5


@pytest.mark.parametrize("prefix", ["gaming", "phone", "home"])
def test_photos_replace_only_seed_placeholders(client, engine, prefix):
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
        assert product.payload["image"] == f"/assets/products/{prefix}-01.webp"
        assert product.payload["description"] == "Custom description"
        assert product.price == Decimal("321.50")
        assert product.stock == 3
        assert db.get(Product, f"{prefix}-02").payload["image"] == "/assets/products/custom-console.webp"
    register(client)
    assert write(client, "PUT", f"/api/account/cart/{prefix}-01", json={"quantity": 1}).status_code == 204
    assert client.get("/api/account/cart").json()[0]["product"]["image"] == f"/assets/products/{prefix}-01.webp"
    assert client.get(f"/api/products/{prefix}-01").json()["image"] == f"/assets/products/{prefix}-01.webp"


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
