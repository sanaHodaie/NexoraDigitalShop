from copy import deepcopy
from datetime import timedelta
from decimal import Decimal

from conftest import CHECKOUT, register, write
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import utcnow
from app.infrastructure.models import Order, Product, User
from tests.security.test_management import grant


def draft(client, quantity=2, payload=None):
    pid = client.get("/api/products").json()[0]["id"]
    assert write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": quantity}).status_code == 204
    result = write(client, "POST", "/api/account/invoices", json=payload or CHECKOUT)
    assert result.status_code == 200, result.text
    return pid, result.json()["id"]


def test_address_required_validated_and_csrf(client):
    register(client)
    assert write(client, "POST", "/api/account/invoices", json={}).status_code == 400
    assert write(client, "POST", "/api/account/orders", json={}).status_code == 400
    for key, value in [("recipient", " "), ("phone", "123"), ("postalCode", "12"), ("address", " ")]:
        payload = deepcopy(CHECKOUT)
        payload["shippingAddress"][key] = value
        assert write(client, "POST", "/api/account/invoices", json=payload).status_code == 400
    assert client.post("/api/account/invoices", json=CHECKOUT).status_code == 400


def test_draft_does_not_reserve_and_submit_is_idempotent(client, engine):
    register(client)
    pid, oid = draft(client, payload={**CHECKOUT, "total": 0, "status": "paid", "userId": 999})
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 100
        assert db.get(Order, oid).status == "draft"
    assert client.get("/api/account/cart").json()[0]["quantity"] == 2
    detail = client.get(f"/api/account/orders/{oid}").json()
    assert detail["invoiceId"] == oid and detail["totalRial"] > 0
    for _ in range(2):
        response = write(client, "POST", f"/api/account/orders/{oid}/submit")
        assert response.status_code == 200, response.text
        assert response.json()["id"] == oid
    assert client.get("/api/account/cart").json() == []
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 98


def test_price_change_rolls_back_reservation(client, engine):
    register(client)
    pid, oid = draft(client)
    with Session(engine) as db, db.begin():
        db.get(Product, pid).price += Decimal("1")
    assert write(client, "POST", f"/api/account/orders/{oid}/submit").status_code == 409
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 100
        assert db.get(Order, oid).status == "draft"
    assert client.get("/api/account/cart").json()


def test_draft_cart_change_expiration_and_cancel_do_not_release_stock(client, engine):
    register(client)
    pid, oid = draft(client)
    write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 1})
    assert write(client, "POST", f"/api/account/orders/{oid}/submit").status_code == 409
    write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 2})
    with Session(engine) as db, db.begin():
        db.get(Order, oid).created_at = utcnow() - timedelta(days=2)
    assert write(client, "POST", f"/api/account/orders/{oid}/submit").status_code == 409
    assert write(client, "POST", f"/api/account/orders/{oid}/cancel").json()["status"] == "cancelled"
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 100


def test_invoice_auth_snapshot_escaping_and_admin_parity(client, app, engine):
    register(client)
    payload = deepcopy(CHECKOUT)
    payload["shippingAddress"]["recipient"] = "<script>alert(1)</script>"
    pid, oid = draft(client, payload=payload)
    path = f"/api/account/orders/{oid}"
    before = client.get(path).json()
    with Session(engine) as db, db.begin():
        db.get(Product, pid).name = "Changed name"
        db.scalar(select(User)).email = "changed@example.com"
    after = client.get(path).json()
    assert after["lines"] == before["lines"] and after["email"] == before["email"]
    doc = client.get(path + "/invoice")
    assert "<script>" not in doc.text and "&lt;script&gt;" in doc.text
    assert doc.headers["cache-control"] == "no-store"
    assert "attachment" in doc.headers["content-disposition"]
    assert "default-src 'none'" in doc.headers["content-security-policy"]
    assert "style-src 'unsafe-inline'" in doc.headers["content-security-policy"]
    assert client.get(f"/api/admin/orders/{oid}/invoice").status_code == 403
    with TestClient(app, base_url="https://shop.test") as other:
        assert other.get(path + "/invoice").status_code == 401
        register(other, "other@example.com")
        assert other.get(path).status_code == 404
        assert other.get(path + "/invoice").status_code == 404
        assert write(other, "POST", path + "/submit").status_code == 404
    # grant() targets the original user email.
    with Session(engine) as db, db.begin():
        db.scalar(select(User).where(User.email == "changed@example.com")).email = "user@example.com"
    grant(engine)
    assert client.get(f"/api/admin/orders/{oid}").json() == after
    assert client.get(f"/api/admin/orders/{oid}/invoice").text == doc.text


def test_payment_updates_both_invoices_and_unlocks_warranty(client, engine):
    register(client)
    grant(engine)
    _, oid = draft(client)
    base = f"/api/admin/orders/{oid}"
    assert client.get(base + "/warranty").status_code == 409
    write(client, "POST", f"/api/account/orders/{oid}/submit")
    assert client.get(base + "/warranty").status_code == 409
    result = write(client, "POST", base + "/confirm-payment", json={"reference": "verified-bank-transfer-1"})
    assert result.status_code == 204, result.text
    customer = client.get(f"/api/account/orders/{oid}").json()
    assert customer["status"] == "paid" and customer["paidAt"]
    assert client.get(base).json() == customer
    assert client.get(base + "/warranty").status_code == 200
    assert f"nexora-warranty-{oid}.html" in client.get(base + "/warranty").headers["content-disposition"]


def test_expired_invoice_releases_reservation_once(client, engine):
    register(client)
    pid, oid = draft(client)
    write(client, "POST", f"/api/account/orders/{oid}/submit")
    with Session(engine) as db, db.begin():
        db.get(Order, oid).reservation_expires_at = utcnow() - timedelta(seconds=1)
    for _ in range(2):
        assert client.get(f"/api/account/orders/{oid}").json()["status"] == "expired"
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 100
