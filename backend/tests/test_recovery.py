from datetime import timedelta

from conftest import register, write
from pydantic import SecretStr
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import PasswordReset, utcnow
from app.security import token_hash


def enable_email(app, monkeypatch):
    app.state.settings.resend_api_key = SecretStr("test-key")
    app.state.settings.mail_from = "Nexora <test@example.com>"
    sent = []
    monkeypatch.setattr(
        "app.recovery.send_reset_email", lambda settings, email, token: sent.append((email, token))
    )
    return sent


def test_recovery_one_time_token_revokes_sessions(client, app, engine, monkeypatch):
    sent = enable_email(app, monkeypatch)
    register(client)
    known = write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"})
    unknown = write(client, "POST", "/api/auth/forgot-password", json={"email": "missing@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    assert len(sent) == 1
    token = sent[0][1]
    with Session(engine) as db:
        row = db.scalar(select(PasswordReset))
        assert row.token_hash == token_hash(token) and row.token_hash != token
    write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"})
    assert len(sent) == 1  # Per-account resend cooldown.
    session_cookie = client.cookies.get("__Host-Nexora")
    payload = {"token": token, "password": "new-safe-password-12345"}
    assert client.post("/api/auth/reset-password", json=payload).status_code == 400
    assert (
        write(client, "POST", "/api/auth/reset-password", json={**payload, "password": "short"}).status_code
        == 400
    )
    assert write(client, "POST", "/api/auth/reset-password", json=payload).status_code == 204
    assert write(client, "POST", "/api/auth/reset-password", json=payload).status_code == 400
    assert (
        client.get("/api/auth/me", headers={"Cookie": f"__Host-Nexora={session_cookie}"}).status_code == 401
    )
    assert (
        write(
            client,
            "POST",
            "/api/auth/login",
            json={"email": "user@example.com", "password": "test-password-12345"},
        ).status_code
        == 401
    )
    assert (
        write(
            client,
            "POST",
            "/api/auth/login",
            json={"email": "user@example.com", "password": payload["password"]},
        ).status_code
        == 200
    )


def test_expired_and_unavailable_recovery(client, app, engine, monkeypatch):
    app.state.settings.resend_api_key = None
    assert (
        write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"}).status_code
        == 503
    )
    sent = enable_email(app, monkeypatch)
    register(client)
    write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"})
    with Session(engine) as db:
        db.execute(update(PasswordReset).values(expires_at=utcnow() - timedelta(minutes=1)))
        db.commit()
    assert (
        write(
            client,
            "POST",
            "/api/auth/reset-password",
            json={"token": sent[0][1], "password": "new-safe-password-12345"},
        ).status_code
        == 400
    )
    assert client.get("/api/auth/me").status_code == 200
    app.state.settings.auth_rate_limit = 0
    assert (
        write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"}).status_code
        == 429
    )


def test_email_failure_does_not_leave_active_token(client, app, engine, monkeypatch):
    enable_email(app, monkeypatch)
    register(client)

    def failed(*args):
        raise OSError("test delivery error")

    monkeypatch.setattr("app.recovery.send_reset_email", failed)
    assert (
        write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"}).status_code
        == 202
    )
    with Session(engine) as db:
        assert db.scalar(select(PasswordReset)) is None


def test_authenticated_password_change(client, app, engine, monkeypatch):
    payload = {"newPassword": "changed-password-12345"}
    assert write(client, "POST", "/api/account/password", json=payload).status_code == 401
    sent = enable_email(app, monkeypatch)
    register(client)
    old_cookie = client.cookies.get("__Host-Nexora")
    write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"})
    assert sent
    assert client.post("/api/account/password", json=payload).status_code == 400
    assert (
        write(client, "POST", "/api/account/password", json={**payload, "newPassword": "short"}).status_code
        == 400
    )
    assert (
        write(
            client,
            "POST",
            "/api/account/password",
            json={**payload, "newPassword": "test-password-12345"},
        ).status_code
        == 400
    )
    assert write(client, "POST", "/api/account/password", json=payload).status_code == 204
    assert client.cookies.get("__Host-Nexora") != old_cookie
    assert client.get("/api/auth/me").status_code == 200
    assert client.get("/api/auth/me", headers={"Cookie": f"__Host-Nexora={old_cookie}"}).status_code == 401
    with Session(engine) as db:
        assert db.scalar(select(PasswordReset)) is None
    assert (
        write(
            client,
            "POST",
            "/api/auth/login",
            json={"email": "user@example.com", "password": "test-password-12345"},
        ).status_code
        == 401
    )
    assert (
        write(
            client,
            "POST",
            "/api/auth/login",
            json={"email": "user@example.com", "password": payload["newPassword"]},
        ).status_code
        == 200
    )
