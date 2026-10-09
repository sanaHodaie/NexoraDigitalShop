from datetime import timedelta

from conftest import register, write
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import PasswordReset, utcnow
from app.security import token_hash


def enable_email(app, monkeypatch):
    from dataclasses import replace
    from types import SimpleNamespace

    from app.infrastructure.worker import Worker

    identity = app.state.services.identity
    identity.policy = replace(identity.policy, email_enabled=True)
    sent = []
    sender = SimpleNamespace(
        send=lambda kind, payload, job_id: sent.append((payload["email"], payload.get("token"), kind))
    )
    worker = Worker(app.state.engine, app.state.services.cipher, identity, app.state.services.orders, sender)
    app.state.test_worker = worker
    app.state.test_sender = sender
    return sent


def drain(app):
    for _ in range(20):
        if not app.state.test_worker.once():
            break


def test_recovery_one_time_token_revokes_sessions(client, app, engine, monkeypatch):
    sent = enable_email(app, monkeypatch)
    register(client)
    known = write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"})
    unknown = write(client, "POST", "/api/auth/forgot-password", json={"email": "missing@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    drain(app)
    reset_links = [item for item in sent if item[2] == "reset_link"]
    assert len(reset_links) == 1
    token = reset_links[0][1]
    with Session(engine) as db:
        row = db.scalar(select(PasswordReset))
        assert row.token_hash == token_hash(token) and row.token_hash != token
    write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"})
    # Delivery occurs only when a worker processes the durable job.
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
    drain(app)
    with Session(engine) as db:
        db.execute(update(PasswordReset).values(expires_at=utcnow() - timedelta(minutes=1)))
        db.commit()
    assert (
        write(
            client,
            "POST",
            "/api/auth/reset-password",
            json={
                "token": next(item[1] for item in sent if item[2] == "reset_link"),
                "password": "new-safe-password-12345",
            },
        ).status_code
        == 400
    )
    assert client.get("/api/auth/me").status_code == 200
    app.state.settings.auth_rate_limit = 0
    assert (
        write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"}).status_code
        == 429
    )


def test_email_failure_keeps_encrypted_retry_job(client, app, engine, monkeypatch):
    enable_email(app, monkeypatch)
    register(client)

    def failed(*args):
        raise OSError("test delivery error")

    monkeypatch.setattr(app.state.test_sender, "send", failed)
    assert (
        write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"}).status_code
        == 202
    )
    drain(app)
    from app.infrastructure.models import Outbox

    with Session(engine) as db:
        assert db.scalar(select(PasswordReset)) is not None
        job = db.scalar(select(Outbox).where(Outbox.kind == "reset_link"))
        assert job.attempts == 1 and job.completed_at is None and job.failed_at is None
        assert "token" not in job.payload


def test_authenticated_password_change(client, app, engine, monkeypatch):
    payload = {"currentPassword": "test-password-12345", "newPassword": "changed-password-12345"}
    assert write(client, "POST", "/api/account/password", json=payload).status_code == 401
    sent = enable_email(app, monkeypatch)
    register(client)
    old_cookie = client.cookies.get("__Host-Nexora")
    write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"})
    drain(app)
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
