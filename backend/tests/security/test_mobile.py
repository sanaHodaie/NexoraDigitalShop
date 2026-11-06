"""Native session lifecycle and the boundary between bearer and cookie auth."""
from conftest import register
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import AuthSession, Role, RolePermission, User, UserRole

PASSWORD = "test-password-12345"


def manager(client, engine, permissions=("admin:access", "orders:read", "orders:cancel")):
    register(client)
    with Session(engine) as db, db.begin():
        uid = db.scalar(select(User.id).where(User.email == "user@example.com"))
        db.add(Role(name="mobile-test"))
        db.flush()
        db.add_all(RolePermission(role="mobile-test", permission=p) for p in permissions)
        db.add(UserRole(user_id=uid, role="mobile-test"))
    client.cookies.clear()
    response = client.post("/api/mobile/session", json={"email": "user@example.com", "password": PASSWORD})
    assert response.status_code == 200, response.text
    assert "set-cookie" not in response.headers
    assert response.headers["Cache-Control"] == "no-store"
    return {"Authorization": "Bearer " + response.json()["token"]}


def test_native_admin_session_and_logout(client, engine):
    headers = manager(client, engine)
    assert client.get("/api/mobile/session", headers=headers).json()["email"] == "user@example.com"
    assert client.get("/api/admin/customer-requests", headers=headers).status_code == 200
    assert client.get("/api/admin/products", headers=headers).status_code == 403
    assert client.delete("/api/mobile/session", headers=headers).status_code == 204
    assert client.get("/api/admin/customer-requests", headers=headers).status_code == 401


def test_cookie_csrf_and_account_routes_are_not_bypassed(client, engine):
    headers = manager(client, engine)
    # Native tokens cannot authorize browser account endpoints or bypass their CSRF.
    assert client.post("/api/auth/logout", headers=headers).status_code == 400
    assert client.get("/api/account/profile", headers=headers).status_code == 401
    register(client, "other@example.com")
    # A cookie login cannot be used on the native session endpoint.
    assert client.get("/api/mobile/session").status_code == 401
    assert client.delete("/api/mobile/session").status_code == 400
    # Invalid bearer must not fall back to the (valid) cookie session.
    assert client.get("/api/admin/me", headers={"Authorization": "Bearer invalid"}).status_code == 401
    assert client.patch("/api/admin/customer-requests/1", json={}).status_code == 400


def test_non_manager_login_revokes_its_new_session(client, engine):
    register(client)
    client.cookies.clear()
    response = client.post("/api/mobile/session", json={"email": "user@example.com", "password": PASSWORD})
    assert response.status_code == 403
    assert "token" not in response.json()
    with Session(engine) as db:
        rows = list(db.scalars(select(AuthSession).order_by(AuthSession.created_at)))
        assert rows[-1].revoked_at is not None


def test_native_login_uses_existing_rate_limits(client, app):
    app.state.settings.login_account_limit = 1
    data = {"email": "missing@example.com", "password": PASSWORD}
    assert client.post("/api/mobile/session", json=data).status_code == 401
    assert client.post("/api/mobile/session", json=data).status_code == 429


def test_configured_web_preview_origin_can_use_authorization(engine, settings):
    from fastapi.testclient import TestClient

    from app.main import create_app

    settings.allowed_origins = ["http://localhost:8081"]
    with TestClient(create_app(settings, engine), base_url="https://shop.test") as client:
        headers = {"Origin": "http://localhost:8081", "Access-Control-Request-Method": "POST",
                   "Access-Control-Request-Headers": "authorization,content-type"}
        result = client.options("/api/mobile/session", headers=headers)
        assert result.status_code == 200
        assert result.headers["access-control-allow-origin"] == "http://localhost:8081"
        headers["Origin"] = "https://untrusted.example.test"
        assert client.options("/api/mobile/session", headers=headers).status_code == 400


def test_request_detail_and_bearer_write_preserve_permissions_and_conflicts(client, engine):
    from uuid import uuid4

    from app.infrastructure.customer_requests import CustomerRequests

    headers = manager(client, engine)
    created = CustomerRequests(engine).create(str(uuid4()), 12345678, "test", "wholesale", {
        "name": "Test Customer", "phone": "09123456789", "items": "Phone", "quantity": 10,
        "city": "Tehran", "address": "Test Street", "company": "", "notes": "",
    })
    path = "/api/admin/customer-requests/" + str(created["id"])
    detail = client.get(path, headers=headers)
    assert detail.status_code == 200
    assert detail.json()["details"]["address"] == "Test Street"
    assert detail.json()["deliveryStatus"] == "none"
    body = {"status": "reviewing", "staffNote": "Contact tomorrow", "version": 1}
    assert client.patch(path, headers=headers, json=body).status_code == 200
    assert client.patch(path, headers=headers, json=body).status_code == 409
    assert client.get(path + "/invoice", headers=headers).status_code == 404
    assert client.get("/api/admin/customer-requests/99999", headers=headers).status_code == 404
    assert client.get(path).status_code == 401


def test_revoked_roles_apply_to_existing_native_sessions(client, engine):
    from sqlalchemy import delete

    headers = manager(client, engine)
    with Session(engine) as db, db.begin():
        db.execute(delete(UserRole))
    assert client.get("/api/mobile/session", headers=headers).status_code == 403
    assert client.get("/api/admin/customer-requests", headers=headers).status_code == 403


def test_native_approval_downloads_canonical_pdf_without_duplicate_invoice(client, engine, app):
    from uuid import uuid4

    from pydantic import SecretStr

    from app.infrastructure.customer_requests import CustomerRequests

    headers = manager(client, engine, ("admin:access", "orders:read", "orders:confirm_payment"))
    app.state.settings.telegram_bot_token = SecretStr("fixture-token-not-sent")
    store = CustomerRequests(engine)
    created = store.create(str(uuid4()), 12345678, "test", "wholesale", {
        "name": "مشتری تست", "phone": "09123456789", "items": "گوشی", "quantity": 10,
        "city": "تهران", "address": "خیابان آزمایشی", "company": "", "notes": "",
    })
    path = "/api/admin/customer-requests/" + str(created["id"])
    body = {"version": 1, "lines": [{"name": "گوشی", "quantity": 10, "unitPriceRial": 25000000}], "shippingRial": 0, "terms": "Test"}
    first = client.post(path + "/approve", headers=headers, json=body)
    assert first.status_code == 200
    code = first.json()["trackingCode"]
    assert len(code) == 8 and code.isdigit()
    assert client.post(path + "/approve", headers=headers, json=body).json()["trackingCode"] == code
    pdf = client.get(path + "/invoice", headers=headers)
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    assert pdf.content == store.pdf(created["id"], 12345678)[0]
    assert client.get(path, headers=headers).json()["deliveryStatus"] == "pending"
