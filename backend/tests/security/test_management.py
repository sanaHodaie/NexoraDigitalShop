from datetime import timedelta
from io import BytesIO

from conftest import CHECKOUT, register, write
from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import utcnow
from app.domain.management import MANAGEMENT_PERMISSIONS
from app.infrastructure.models import AuthSession, Product, Role, RolePermission, User, UserRole
from app.seed import seed


def upload(client, raw, content_type="image/png"):
    token = client.get("/api/csrf").json()["token"]
    return client.post(
        "/api/admin/media", content=raw, headers={"X-CSRF-TOKEN": token, "Content-Type": content_type}
    )


def test_product_category_filter_before_pagination(client, engine):
    register(client)
    grant(engine)
    result = client.get("/api/admin/products?category=audio&size=2").json()
    assert result["total"] > 2
    assert len(result["items"]) == 2
    assert all(row["category"] == "audio" for row in result["items"])
    assert client.get("/api/admin/products?category=audio&q=phone-01").json()["total"] == 0
    assert all(
        row["category"] == "audio"
        for row in client.get("/api/admin/products?category=audio&page=2&size=2").json()["items"]
    )


def test_rial_price_round_trip_and_order_snapshot(client, engine):
    register(client)
    grant(engine)
    row = client.get("/api/admin/products?q=extra-01").json()["items"][0]
    body = product_input(row)
    del body["price"]
    body["priceRial"] = 123456789
    result = write(client, "PUT", "/api/admin/products/extra-01", json=body)
    assert result.status_code == 200, result.text
    assert round(result.json()["price"] * 600000) == 123456789
    assert round(client.get("/api/products/extra-01").json()["price"] * 600000) == 123456789
    assert write(client, "PUT", "/api/account/cart/extra-01", json={"quantity": 2}).status_code == 204
    order = write(client, "POST", "/api/account/orders", json=CHECKOUT).json()
    assert round(order["total"] * 600000) == 246913578
    body["expectedStock"] = row["stock"] - 2
    body["priceRial"] = 50000000
    assert write(client, "PUT", "/api/admin/products/extra-01", json=body).status_code == 200
    saved = client.get("/api/admin/orders").json()["items"][0]
    assert round(saved["lines"][0]["unitPrice"] * 600000) == 123456789
    assert round(saved["total"] * 600000) == 246913578
    body["price"] = "1.00"  # Ambiguous units must not silently override one another.
    assert write(client, "PUT", "/api/admin/products/extra-01", json=body).status_code == 400


def test_photo_upload_authentication_permissions_csrf_and_validation(client, engine):
    image = BytesIO()
    Image.new("RGB", (12, 15), "white").save(image, "PNG")
    raw = image.getvalue()
    assert upload(client, raw).status_code == 401
    register(client)
    assert upload(client, raw).status_code == 403
    grant(engine)
    assert (
        client.post("/api/admin/media", content=raw, headers={"Content-Type": "image/png"}).status_code == 400
    )
    assert upload(client, b'<svg onload="alert(1)"/>').status_code == 400
    assert upload(client, raw, "image/svg+xml").status_code == 415
    assert upload(client, b"x" * (2 * 1024 * 1024 + 1)).status_code == 413
    assert upload(client, raw[:30]).status_code == 400
    oversized = BytesIO()
    Image.new("1", (4001, 4000)).save(oversized, "PNG")
    assert upload(client, oversized.getvalue()).status_code == 400


def test_photo_persists_as_webp_and_is_used_by_catalog(client, engine):
    register(client)
    grant(engine)
    image = BytesIO()
    Image.new("RGBA", (1800, 1200), (20, 40, 80, 128)).save(image, "PNG")
    result = upload(client, image.getvalue())
    assert result.status_code == 201, result.text
    url = result.json()["url"]
    assert upload(client, image.getvalue()).json()["url"] == url
    response = client.get(url)
    assert response.headers["content-type"] == "image/webp"
    assert response.headers["x-content-type-options"] == "nosniff"
    with Image.open(BytesIO(response.content)) as decoded:
        assert decoded.size == (1600, 1067)
        assert not decoded.getexif()
    body = product_input(client.get("/api/admin/products?q=extra-01").json()["items"][0])
    body["image"] = url
    assert write(client, "PUT", "/api/admin/products/extra-01", json=body).status_code == 200
    assert client.get("/api/products/extra-01").json()["image"] == url
    write(client, "POST", "/api/auth/logout")
    assert client.get(url).status_code == 200
    assert "immutable" in client.get(url).headers["cache-control"]
    assert client.get("/api/media/" + "0" * 64 + ".webp").status_code == 404


def grant(engine, email="user@example.com", permissions=MANAGEMENT_PERMISSIONS):
    with Session(engine) as db, db.begin():
        uid = db.scalar(select(User.id).where(User.email == email))
        role = "test-manager-" + str(uid)
        db.add(Role(name=role))
        db.flush()
        db.add_all(RolePermission(role=role, permission=p) for p in permissions)
        db.add(UserRole(user_id=uid, role=role))
        return uid


def product_input(row):
    return {
        k: row.get(k, "")
        for k in (
            "id",
            "name",
            "nameEn",
            "category",
            "categoryFa",
            "brand",
            "price",
            "stock",
            "image",
            "description",
            "specs",
        )
    } | {"isActive": row["isActive"], "expectedStock": row["stock"], "badge": row.get("badge", "")}


def test_management_requires_authentication_and_permissions(client, engine):
    assert client.get("/api/admin/me").status_code == 401
    register(client)
    for path in (
        "me",
        "dashboard",
        "products",
        "orders",
        "users",
        "subscribers",
        "audit",
        "activity",
        "content",
    ):
        assert client.get("/api/admin/" + path).status_code == 403
    grant(engine, permissions=("admin:access", "audit:read"))
    assert client.get("/api/admin/me").status_code == 200
    assert client.get("/api/admin/audit").status_code == 200
    assert client.get("/api/admin/users").status_code == 403
    assert write(client, "DELETE", "/api/admin/products/extra-01").status_code == 403


def test_registration_and_login_events_are_real_and_private(client, engine):
    register(client)
    uid = grant(engine)
    events = client.get("/api/admin/audit").json()["items"]
    assert {e["event"] for e in events} >= {"REGISTER_SUCCESS", "LOGIN_SUCCESS"}
    assert all(e["userId"] == uid for e in events)
    assert all(e["email"] == "user@example.com" for e in events)
    write(
        client,
        "POST",
        "/api/auth/register",
        json={"email": "user@example.com", "password": "new-password-12345"},
    )
    events = client.get("/api/admin/audit?event=REGISTER_SUCCESS").json()["items"]
    assert len(events) == 1
    write(
        client, "POST", "/api/auth/login", json={"email": "unknown@example.com", "password": "bad-password"}
    )
    response = client.get("/api/admin/audit?event=LOGIN_FAILED")
    assert response.json()["items"][0]["email"] is None
    assert "unknown@example.com" not in response.text
    for secret in ("password_hash", "token_hash", "test-password-12345", "csrf"):
        assert secret not in response.text
    paged = client.get("/api/admin/audit?size=1").json()
    older = client.get("/api/admin/audit?before=" + str(paged["items"][0]["id"])).json()["items"]
    assert all(e["id"] < paged["items"][0]["id"] for e in older)


def test_product_edits_archive_and_csrf(client, engine):
    register(client)
    grant(engine)
    row = client.get("/api/admin/products?q=extra-01").json()["items"][0]
    body = product_input(row)
    body["price"] = "123.45"
    body["stock"] = 8
    assert client.put("/api/admin/products/extra-01", json=body).status_code == 400
    assert write(client, "PUT", "/api/admin/products/extra-01", json=body).status_code == 200
    assert client.get("/api/products/extra-01").json()["price"] == 123.45
    assert write(client, "PUT", "/api/admin/products/extra-01", json=body).status_code == 409
    body["expectedStock"] = 8
    body["image"] = "javascript:alert(1)"
    assert write(client, "PUT", "/api/admin/products/extra-01", json=body).status_code == 400
    assert write(client, "DELETE", "/api/admin/products/extra-01").status_code == 204
    assert client.get("/api/products/extra-01").status_code == 404
    assert "extra-01" not in {p["id"] for p in client.get("/api/products").json()}
    assert write(client, "PUT", "/api/account/cart/extra-01", json={"quantity": 1}).status_code == 404
    seed(engine)
    with Session(engine) as db:
        assert not db.get(Product, "extra-01").is_active


def test_new_product_and_validation(client, engine):
    register(client)
    grant(engine)
    body = product_input(client.get("/api/admin/products?q=extra-01").json()["items"][0])
    body["id"] = "new-router"
    body["expectedStock"] = None
    assert write(client, "POST", "/api/admin/products", json=body).status_code == 201
    assert client.get("/api/products/new-router").status_code == 200
    assert write(client, "POST", "/api/admin/products", json=body).status_code == 409
    body["id"] = "bad-router"
    body["stock"] = -1
    assert write(client, "POST", "/api/admin/products", json=body).status_code == 400


def test_content_persists_conflicts_and_draft_visibility(client, engine):
    register(client)
    grant(engine)
    docs = client.get("/api/admin/content").json()
    home = {"data": docs["home"]["data"], "version": docs["home"]["version"]}
    home["data"]["hero"]["title"] = "عنوان جدید"
    assert write(client, "PUT", "/api/admin/content/home", json=home).status_code == 200
    assert write(client, "PUT", "/api/admin/content/home", json=home).status_code == 409
    seed(engine)
    assert client.get("/api/content").json()["home"]["hero"]["title"] == "عنوان جدید"
    article = {"data": docs["articles"]["data"], "version": docs["articles"]["version"]}
    slug = article["data"]["items"][0]["metadata"]["slug"]
    article["data"]["items"][0]["published"] = False
    assert write(client, "PUT", "/api/admin/content/articles", json=article).status_code == 200
    assert slug not in {a["metadata"]["slug"] for a in client.get("/api/content").json()["articles"]["items"]}
    article["version"] += 1
    article["data"]["items"][1]["content"]["sections"][0]["sources"] = [
        {"label": "bad", "url": "javascript:alert(1)"}
    ]
    assert write(client, "PUT", "/api/admin/content/articles", json=article).status_code == 400


def test_manager_cancel_releases_stock_once(client, engine):
    register(client)
    grant(engine)
    write(client, "PUT", "/api/account/cart/extra-01", json={"quantity": 2})
    order = write(client, "POST", "/api/account/orders", json=CHECKOUT).json()
    oid = order["id"]
    with Session(engine) as db:
        stock = db.get(Product, "extra-01").stock
    assert write(client, "POST", f"/api/admin/orders/{oid}/cancel").status_code == 204
    assert write(client, "POST", f"/api/admin/orders/{oid}/cancel").status_code == 409
    with Session(engine) as db:
        assert db.get(Product, "extra-01").stock == stock + 2


def test_revoke_and_recent_activity_exclude_expired_sessions(client, engine):
    register(client)
    uid = grant(engine)
    assert client.get("/api/admin/activity").json()["items"][0]["id"] == uid
    with Session(engine) as db, db.begin():
        user = User(email="expired@example.com", full_name="expired")
        db.add(user)
        db.flush()
        db.add(
            AuthSession(
                token_hash="x" * 64,
                user_id=user.id,
                created_at=utcnow(),
                last_used_at=utcnow(),
                expires_at=utcnow() - timedelta(seconds=1),
            )
        )
    assert len(client.get("/api/admin/activity").json()["items"]) == 1
    assert write(client, "POST", f"/api/admin/users/{uid}/revoke-sessions").status_code == 204
    assert client.get("/api/admin/me").status_code == 401
