import secrets
from datetime import timedelta
from types import SimpleNamespace

import pytest
from conftest import register, write
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.domain.entities import utcnow
from app.domain.errors import BusinessError
from app.infrastructure.crypto import token_hash
from app.infrastructure.models import (
    ActionToken,
    AuditLog,
    AuthSession,
    Order,
    Product,
    Role,
    RolePermission,
    User,
    UserRole,
)
from app.infrastructure.rate_limit import RedisLimiter, bucket


def checkout(client):
    pid = client.get("/api/products").json()[0]["id"]
    assert (
        write(client, "PUT", f"/api/account/cart/{pid}", json={"quantity": 1, "price": 0}).status_code == 204
    )
    result = write(client, "POST", "/api/account/orders", json={"total": 0, "userId": 999})
    assert result.status_code == 200, result.text
    return pid, result.json()


def test_wrong_current_password_and_revocation_of_other_devices(client, app, engine):
    register(client)
    with TestClient(app, base_url="https://shop.test") as other:
        write(
            other,
            "POST",
            "/api/auth/login",
            json={"email": "user@example.com", "password": "test-password-12345"},
        )
        old = client.cookies.get("__Host-Nexora")
        data = {"currentPassword": "wrong", "newPassword": "replacement-password-123"}
        assert write(client, "POST", "/api/account/password", json=data).status_code == 400
        assert other.get("/api/auth/me").status_code == 200
        data["currentPassword"] = "test-password-12345"
        assert write(client, "POST", "/api/account/password", json=data).status_code == 204
        assert client.cookies.get("__Host-Nexora") != old
        assert other.get("/api/auth/me").status_code == 401
        assert client.get("/api/auth/me").status_code == 200
    with Session(engine) as db:
        events = list(db.scalars(select(AuditLog.event)))
        assert "PASSWORD_CHANGED" in events and "SESSION_REVOKED" in events
        assert db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash(old))).revoked_at


def test_invalid_idle_session_and_logout_all(client, app, engine):
    client.cookies.set("__Host-Nexora", "forged")
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.clear()
    register(client)
    with Session(engine) as db:
        db.execute(update(AuthSession).values(last_used_at=utcnow() - timedelta(hours=1)))
        db.commit()
    assert client.get("/api/auth/me").status_code == 401
    write(
        client,
        "POST",
        "/api/auth/login",
        json={"email": "user@example.com", "password": "test-password-12345"},
    )
    with TestClient(app, base_url="https://shop.test") as other:
        write(
            other,
            "POST",
            "/api/auth/login",
            json={"email": "user@example.com", "password": "test-password-12345"},
        )
        assert write(client, "POST", "/api/auth/logout-all").status_code == 204
        assert other.get("/api/auth/me").status_code == 401


def test_email_verification_hash_expiry_one_use_and_checkout_gate(client, app, engine):
    register(client)
    app.state.services.orders.require_verified = True
    assert write(client, "POST", "/api/account/orders").status_code == 403
    token = secrets.token_urlsafe(32)
    with Session(engine) as db:
        user = db.scalar(select(User))
        db.add(
            ActionToken(
                user_id=user.id,
                token_hash=token_hash(token),
                purpose="verify",
                expires_at=utcnow() - timedelta(seconds=1),
            )
        )
        db.commit()
    assert write(client, "POST", "/api/auth/verify-email", json={"token": token}).status_code == 400
    with Session(engine) as db:
        db.execute(update(ActionToken).values(expires_at=utcnow() + timedelta(minutes=5)))
        db.commit()
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 400
    assert write(client, "POST", "/api/auth/verify-email", json={"token": token}).status_code == 204
    assert client.get("/api/auth/me").json()["emailVerifiedAt"]
    assert write(client, "POST", "/api/auth/verify-email", json={"token": token}).status_code == 400
    checkout(client)


def test_order_cancel_expire_and_cross_account_authorization(client, app, engine):
    register(client)
    pid, order = checkout(client)
    with TestClient(app, base_url="https://shop.test") as other:
        register(other, "other@example.com")
        assert write(other, "POST", f"/api/account/orders/{order['id']}/cancel").status_code == 404
    path = f"/api/account/orders/{order['id']}/cancel"
    assert write(client, "POST", path).json()["status"] == "cancelled"
    assert write(client, "POST", path).json()["status"] == "cancelled"
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 100
    _, order = checkout(client)
    with Session(engine) as db:
        db.get(Order, order["id"]).reservation_expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert app.state.services.orders.expire_due() == 1
    assert app.state.services.orders.expire_due() == 0
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 100
        assert db.get(Order, order["id"]).status == "expired"


def test_permissions_not_role_label_and_payment_idempotence(client, app, engine):
    register(client)
    pid, order = checkout(client)
    path = f"/api/management/orders/{order['id']}/confirm-payment"
    assert write(client, "POST", path, json={"reference": "payment-1"}).status_code == 403
    with Session(engine) as db:
        uid = db.scalar(select(User.id))
        db.add(Role(name="custom_operator"))
        db.flush()
        db.add(UserRole(user_id=uid, role="custom_operator"))
        db.commit()
    assert write(client, "POST", path, json={"reference": "payment-1"}).status_code == 403
    with Session(engine) as db:
        db.add(RolePermission(role="custom_operator", permission="orders:confirm_payment"))
        db.commit()
    for _ in range(2):
        assert write(client, "POST", path, json={"reference": "payment-1"}).json()["status"] == "paid"
    assert write(client, "POST", f"/api/account/orders/{order['id']}/cancel").status_code == 409
    app.state.services.orders.expire(order["id"])
    with Session(engine) as db:
        assert db.get(Product, pid).stock == 99
        assert list(db.scalars(select(AuditLog.event))).count("PAYMENT_CONFIRMED") == 1


def test_login_enumeration_account_limit_and_separate_buckets(client, app):
    register(client)
    known = write(client, "POST", "/api/auth/login", json={"email": "user@example.com", "password": "wrong"})
    unknown = write(
        client, "POST", "/api/auth/login", json={"email": "missing@example.com", "password": "wrong"}
    )
    assert known.status_code == unknown.status_code == 401 and known.json() == unknown.json()
    app.state.settings.login_account_limit = 2
    assert (
        write(
            client, "POST", "/api/auth/login", json={"email": "user@example.com", "password": "wrong"}
        ).status_code
        == 429
    )
    assert (
        write(
            client,
            "POST",
            "/api/auth/register",
            json={"email": "new@example.com", "password": "test-password-12345"},
        ).status_code
        == 202
    )
    assert "user@example.com" not in bucket(app.state.settings, "login", "user@example.com")


def test_redis_failure_is_closed_and_lua_is_atomic():
    limiter = RedisLimiter("redis://localhost:1")

    def fail(*args):
        raise ConnectionError("sensitive URL")

    limiter.client = SimpleNamespace(eval=fail)
    with pytest.raises(BusinessError) as exc:
        limiter.allow("key", 1)
    assert exc.value.status == 503
    assert "sensitive" not in str(exc.value)


def test_headers_and_no_secret_in_validation(client):
    response = client.get("/api/products")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "default-src 'none'" in response.headers["content-security-policy"]
    assert response.headers["referrer-policy"] == "no-referrer"
    secret = "never-echo-this-password"
    response = write(client, "POST", "/api/auth/reset-password", json={"token": secret, "password": secret})
    assert response.status_code == 400 and secret not in response.text
