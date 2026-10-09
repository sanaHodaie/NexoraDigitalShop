from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from conftest import register, write
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from alembic import command
from app.config import Settings
from app.db import Base
from app.main import create_app
from app.models import AuthSession, Order, OrderLine, Product, Subscriber, User, utcnow
from app.security import token_hash
from app.seed import seed


def test_catalogue_contract_and_literal_search(client):
    products = client.get("/api/products").json()
    assert len(products) > 1
    assert isinstance(products[0]["price"], (int, float))
    assert {"nameEn", "inStock", "category"} <= products[0].keys()
    assert len(client.get("/api/products?limit=0").json()) == 1
    assert client.get("/api/products?q=%25").json() == []
    assert client.get("/api/products", params={"q": "x" * 101}).status_code == 400
    assert client.get("/api/products/missing").status_code == 404
    assert client.get("/api/products/" + products[0]["id"]).json() == products[0]
    assert all(
        p["category"] == products[0]["category"]
        for p in client.get("/api/products", params={"category": products[0]["category"]}).json()
    )


def test_registration_cookies_validation_and_revocation(client, app, engine):
    assert client.post("/api/auth/register", json={}).status_code == 400
    bad = write(client, "POST", "/api/auth/register", json={"email": "bad", "password": "secret"})
    assert bad.status_code == 400 and "secret" not in bad.text and "error" in bad.json()
    response = register(client, " USER@Example.COM ")
    assert response.json()["email"] == "user@example.com"
    cookie = response.headers["set-cookie"]
    assert all(
        flag in cookie for flag in ["__Host-Nexora=", "HttpOnly", "Secure", "SameSite=strict", "Path=/"]
    )
    me = client.get("/api/auth/me")
    assert {k: v for k, v in me.json().items() if k != "emailVerifiedAt"} == {
        "email": "user@example.com",
        "fullName": "کاربر آزمایشی",
    }
    assert me.headers["cache-control"] == "no-store"
    duplicate = write(
        client,
        "POST",
        "/api/auth/register",
        json={"email": "user@example.com", "password": "test-password-12345"},
    )
    assert duplicate.status_code == 202
    old_session = client.cookies.get("__Host-Nexora")
    with Session(engine) as db:
        user = db.scalar(select(User))
        assert user.password_hash.startswith("$argon2")
        session = db.scalar(select(AuthSession))
        assert session.token_hash == token_hash(old_session)
    # DB-backed sessions work in a new application instance after deployment.
    with TestClient(create_app(app.state.settings, engine), base_url="https://shop.test") as restarted:
        restarted.cookies.update(client.cookies)
        assert restarted.get("/api/auth/me").status_code == 200
    assert write(client, "POST", "/api/auth/logout").status_code == 204
    client.cookies.set("__Host-Nexora", old_session)
    assert client.get("/api/auth/me").status_code == 401


def test_login_and_expired_session(client, engine):
    register(client)
    write(client, "POST", "/api/auth/logout")
    for email in ["user@example.com", "missing@example.com"]:
        assert (
            write(
                client, "POST", "/api/auth/login", json={"email": email, "password": "incorrect"}
            ).status_code
            == 401
        )
    assert (
        write(
            client,
            "POST",
            "/api/auth/login",
            json={"email": " USER@EXAMPLE.COM ", "password": "test-password-12345"},
        ).status_code
        == 200
    )
    with Session(engine) as db:
        db.execute(update(AuthSession).values(expires_at=utcnow() - timedelta(seconds=1)))
        db.commit()
    assert client.get("/api/auth/me").status_code == 401


def test_csrf_bound_to_browser_and_login_session(client, app):
    anonymous_token = client.get("/api/csrf").json()["token"]
    with TestClient(app, base_url="https://shop.test") as other:
        other.get("/api/csrf")
        assert (
            other.post(
                "/api/newsletter", headers={"X-CSRF-TOKEN": anonymous_token}, json={"email": "a@b.com"}
            ).status_code
            == 400
        )
    register(client)
    assert client.post("/api/auth/logout", headers={"X-CSRF-TOKEN": anonymous_token}).status_code == 400
    assert client.post("/api/auth/logout", headers={"X-CSRF-TOKEN": "x" * 64}).status_code == 400
    assert client.get("/api/auth/me").status_code == 200
    assert write(client, "POST", "/api/auth/logout").status_code == 204


def test_account_isolation_wishlist_cart_and_checkout(client, app, engine):
    assert client.get("/api/account/cart").status_code == 401
    register(client)
    product = client.get("/api/products").json()[0]
    pid = product["id"]
    for quantity in [-1, 100, 1.5, "2", True]:
        assert (
            write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": quantity}).status_code == 400
        )
    assert write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 2}).status_code == 204
    assert client.get("/api/account/cart").json()[0]["quantity"] == 2
    for _ in range(2):
        assert write(client, "PUT", f"/api/account/wishlist/{pid}").status_code == 204
    assert len(client.get("/api/account/wishlist").json()) == 1
    with TestClient(app, base_url="https://shop.test") as other:
        register(other, "other@example.com")
        assert other.get("/api/account/cart").json() == []
        assert other.get("/api/account/wishlist").json() == []
        assert other.get("/api/account/orders").json() == []
    result = write(client, "POST", "/api/account/orders", json={"total": 0}).json()
    subtotal = product["price"] * 2
    assert result["total"] == subtotal + (0 if subtotal >= 99 else 9.99)
    assert result["status"] == "pending_payment"
    assert client.get("/api/account/cart").json() == []
    assert "createdAt" in client.get("/api/account/orders").json()[0]
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 98
        assert db.scalar(select(OrderLine)).unit_price == Decimal(str(product["price"]))
    assert write(client, "POST", "/api/account/orders").status_code == 400
    assert write(client, "DELETE", f"/api/account/wishlist/{pid}").status_code == 204
    assert client.get("/api/account/wishlist").json() == []


def test_failed_order_rolls_back_every_stock_reservation(client, engine):
    register(client)
    products = client.get("/api/products?limit=2").json()
    for product in products:
        write(client, "PUT", f"/api/account/cart/{product['id']}", json={"quantity": 2})
    with Session(engine) as db:
        db.get(Product, products[1]["id"]).stock = 1
        db.commit()
    assert write(client, "POST", "/api/account/orders").status_code == 409
    assert len(client.get("/api/account/cart").json()) == 2
    with Session(engine) as db:
        assert db.get(Product, products[0]["id"]).stock == 100
        assert db.scalar(select(func.count()).select_from(Order)) == 0


def test_cart_clear_shipping_and_stock_status(client, engine):
    register(client)
    pid = client.get("/api/products?limit=1").json()[0]["id"]
    with Session(engine) as db:
        product = db.get(Product, pid)
        product.price, product.stock = Decimal("10.00"), 1
        db.commit()
    assert write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 2}).status_code == 409
    write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 1})
    assert write(client, "POST", "/api/account/orders").json()["total"] == 19.99
    assert client.get(f"/api/products/{pid}").json()["inStock"] is False
    assert write(client, "PUT", "/api/account/cart/missing", json={"quantity": 0}).status_code == 204
    assert write(client, "DELETE", "/api/account/cart").status_code == 204


def test_newsletter_idempotence_and_rate_limit(client, engine, app):
    app.state.settings.newsletter_rate_limit = 2
    for _ in range(2):
        assert (
            write(client, "POST", "/api/newsletter", json={"email": " NEWS@EXAMPLE.COM "}).status_code == 202
        )
    response = write(client, "POST", "/api/newsletter", json={"email": "news@example.com"})
    assert response.status_code == 429
    assert response.headers["retry-after"] == "60"
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Subscriber)) == 1


def test_google_verification_and_no_email_account_linking(client, app, monkeypatch):
    assert client.get("/api/auth/providers").json() == {"googleClientId": None}
    assert write(client, "POST", "/api/auth/google", json={"credential": "forged"}).status_code == 503
    app.state.settings.google_client_id = "test-client.apps.googleusercontent.com"
    app.state.services.identity.google.client_id = app.state.settings.google_client_id
    assert write(client, "POST", "/api/auth/google", json={"credential": "forged"}).status_code == 401
    payload = {
        "sub": "google-123",
        "email": "google@example.com",
        "email_verified": True,
        "name": "Google User",
    }

    def verify(credential, transport, audience):
        assert audience == app.state.settings.google_client_id
        return payload

    monkeypatch.setattr("app.infrastructure.google.id_token.verify_oauth2_token", verify)
    assert (
        write(client, "POST", "/api/auth/google", json={"credential": "header.payload.signature"}).status_code
        == 200
    )
    assert client.get("/api/auth/me").json()["fullName"] == "Google User"
    write(client, "POST", "/api/auth/logout")
    payload["email_verified"] = False
    assert (
        write(client, "POST", "/api/auth/google", json={"credential": "header.payload.signature"}).status_code
        == 401
    )
    payload["email_verified"] = True
    payload["sub"] = "different-google-subject"
    assert (
        write(client, "POST", "/api/auth/google", json={"credential": "header.payload.signature"}).status_code
        == 409
    )


def test_migrations_match_models_and_seed_does_not_reset_stock(engine):
    with engine.connect() as connection:
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
    with Session(engine) as db:
        product = db.scalar(select(Product).order_by(Product.id))
        product.stock, product.price = 7, Decimal("12.34")
        pid = product.id
        db.commit()
    seed(engine)
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 7
        assert db.get(Product, pid).price == Decimal("12.34")


def test_alembic_downgrade_upgrade(engine):
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "base")
        command.upgrade(config, "head")
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []


def test_production_settings_fail_closed():
    with pytest.raises(ValueError):
        Settings(environment="production")
    with pytest.raises(ValueError):
        Settings(environment="production", database_url="sqlite://", secret_key="x" * 48)
    assert Settings(environment="development").secure_cookies is False
    assert (
        Settings(
            environment="production",
            secret_key="x" * 48,
            redis_url="redis://localhost:6379",
            frontend_url="https://shop.test",
        ).secure_cookies
        is True
    )


def test_account_profile_and_order_details_are_private(client, app, engine):
    assert write(client, "PATCH", "/api/account/profile", json={"fullName": "New name"}).status_code == 401
    register(client)
    assert client.patch("/api/account/profile", json={"fullName": "New name"}).status_code == 400
    assert write(client, "PATCH", "/api/account/profile", json={"fullName": "   "}).status_code == 400
    assert write(client, "PATCH", "/api/account/profile", json={"fullName": "x" * 101}).status_code == 400
    response = write(
        client,
        "PATCH",
        "/api/account/profile",
        json={"fullName": " Updated Name ", "email": "attacker@example.com"},
    )
    assert response.json() == {
        "email": "user@example.com",
        "fullName": "Updated Name",
        "emailVerifiedAt": None,
    }
    assert client.get("/api/auth/me").json()["fullName"] == "Updated Name"
    product = client.get("/api/products?limit=1").json()[0]
    write(client, "PUT", f"/api/account/cart/{product['id']}", json={"quantity": 1})
    order = write(client, "POST", "/api/account/orders").json()
    detail = client.get(f"/api/account/orders/{order['id']}")
    assert detail.status_code == 200
    assert detail.headers["cache-control"] == "no-store"
    assert detail.json()["lines"][0] == {
        "productId": product["id"],
        "name": product["name"],
        "quantity": 1,
        "unitPrice": product["price"],
    }
    assert detail.json()["shipping"] == (0 if product["price"] >= 99 else 9.99)
    with TestClient(app, base_url="https://shop.test") as other:
        assert other.get(f"/api/account/orders/{order['id']}").status_code == 401
        register(other, "other@example.com")
        assert other.get(f"/api/account/orders/{order['id']}").status_code == 404
        assert other.get("/api/auth/me").json()["fullName"] != "Updated Name"


def test_login_rate_limit_is_independent(client, app):
    app.state.settings.login_ip_limit = 1
    register(client)
    response = write(
        client, "POST", "/api/auth/login", json={"email": "user@example.com", "password": "wrong"}
    )
    assert response.status_code == 429
    assert client.get("/api/auth/me").status_code == 200


def test_google_signature_and_transport_errors(client, app, monkeypatch):
    from google.auth.exceptions import TransportError

    app.state.settings.google_client_id = "test-client.apps.googleusercontent.com"
    app.state.services.identity.google.client_id = app.state.settings.google_client_id
    for error, status in [(ValueError("bad signature"), 401), (TransportError("unreachable"), 503)]:

        def verify(*args, **kwargs):
            raise error

        monkeypatch.setattr("app.infrastructure.google.id_token.verify_oauth2_token", verify)
        response = write(client, "POST", "/api/auth/google", json={"credential": "header.payload.signature"})
        assert response.status_code == status
        assert client.get("/api/auth/me").status_code == 401


def test_competing_orders_do_not_oversell(app, engine):
    if engine.dialect.name != "postgresql":
        pytest.skip("Real PostgreSQL is required to test competing row locks; set TEST_DATABASE_URL")
    with Session(engine) as db:
        product = db.scalar(select(Product).order_by(Product.id))
        product.stock = 1
        pid = product.id
        db.commit()
    with (
        TestClient(app, base_url="https://shop.test") as first,
        TestClient(app, base_url="https://shop.test") as second,
    ):
        for i, client in enumerate([first, second]):
            register(client, f"buyer-{i}@example.com")
            write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 1})
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(
                pool.map(
                    lambda client: write(client, "POST", "/api/account/orders").status_code, [first, second]
                )
            )
        assert sorted(statuses) == [200, 409]
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 0
        assert db.scalar(select(func.count()).select_from(Order)) == 1
