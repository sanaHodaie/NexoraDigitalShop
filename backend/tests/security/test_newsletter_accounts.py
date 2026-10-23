from conftest import register, write
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import Role, RolePermission, Subscriber, User, UserRole


def test_newsletter_requires_login_and_csrf(client, engine):
    assert write(client, "POST", "/api/newsletter", json={"email": "reader@example.com"}).status_code == 401
    register(client)
    assert client.post("/api/newsletter", json={"email": "reader@example.com"}).status_code == 400
    assert write(client, "POST", "/api/newsletter", json={"email": "invalid"}).status_code == 400
    with Session(engine) as db:
        assert db.scalar(select(Subscriber)) is None


def test_newsletter_records_account_and_entered_email_for_admin(client, engine):
    register(client, "member@example.com")
    for _ in range(2):
        assert (
            write(client, "POST", "/api/newsletter", json={"email": " NEWS@EXAMPLE.COM "}).status_code == 202
        )
    assert client.get("/api/admin/subscribers").status_code == 403
    with Session(engine) as db, db.begin():
        user = db.scalar(select(User).where(User.email == "member@example.com"))
        rows = list(db.scalars(select(Subscriber)))
        assert len(rows) == 1
        assert rows[0].user_id == user.id and rows[0].email == "news@example.com"
        assert rows[0].created_at is not None
        db.add(Role(name="newsletter-reviewer"))
        db.flush()
        db.add_all(
            [
                RolePermission(role="newsletter-reviewer", permission=p)
                for p in ["admin:access", "subscribers:read"]
            ]
        )
        db.add(UserRole(user_id=user.id, role="newsletter-reviewer"))
    result = client.get("/api/admin/subscribers?q=member@example.com").json()
    assert result["total"] == 1
    assert result["items"][0]["email"] == "news@example.com"
    assert result["items"][0]["accountEmail"] == "member@example.com"
    assert result["items"][0]["createdAt"]
    write(client, "POST", "/api/auth/logout")
    register(client, "second@example.com")
    assert write(client, "POST", "/api/newsletter", json={"email": "news@example.com"}).status_code == 202
    with Session(engine) as db:
        rows = list(db.scalars(select(Subscriber)))
        assert len(rows) == 2 and rows[0].user_id != rows[1].user_id


def test_legacy_subscriptions_remain_unattributed(client, engine):
    with Session(engine) as db, db.begin():
        db.add(Subscriber(email="legacy@example.com"))
    register(client)
    assert write(client, "POST", "/api/newsletter", json={"email": "legacy@example.com"}).status_code == 202
    with Session(engine) as db:
        rows = list(db.scalars(select(Subscriber)))
        assert len(rows) == 2
        assert sum(row.user_id is None for row in rows) == 1
