import json
from dataclasses import replace
from datetime import timedelta
from types import SimpleNamespace

import pytest
from conftest import register, write
from pydantic import SecretStr
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.domain.entities import utcnow
from app.infrastructure.mail import EmailSender
from app.infrastructure.models import AuditLog, Outbox, User
from app.infrastructure.worker import Worker


@pytest.mark.parametrize(
    "kind,route",
    [
        ("reset_link", "/reset-password"),
        ("verify_link", "/verify-email"),
        ("email_change_link", "/confirm-email-change"),
    ],
)
def test_email_links_match_frontend_routes_and_tokens_stay_in_fragment(settings, monkeypatch, kind, route):
    settings.resend_api_key = SecretStr("fake-key")
    settings.mail_from = "test@example.com"
    captured = []

    class Reply:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

    def send(request, timeout):
        captured.append(json.loads(request.data))
        assert timeout == 15
        assert request.get_header("Idempotency-key") == "nexora-email-1"
        return Reply()

    monkeypatch.setattr("app.infrastructure.mail.urlopen", send)
    EmailSender(settings).send(kind, {"email": "user@example.com", "token": "safe-test-token"}, 1)
    assert f"{route}#token=safe-test-token" in captured[0]["text"]


def worker_for(app, sender):
    svc = app.state.services
    svc.identity.policy = replace(svc.identity.policy, email_enabled=True)
    return Worker(app.state.engine, svc.cipher, svc.identity, svc.orders, sender)


def test_worker_crash_retry_deduplication_and_encryption(client, app, engine):
    register(client)
    sent = []
    worker = worker_for(app, SimpleNamespace(send=lambda kind, payload, job: sent.append(payload)))
    assert (
        write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"}).status_code
        == 202
    )
    assert worker.once()  # Request job atomically creates token + encrypted send job.
    with Session(engine) as db:
        request = db.scalar(select(Outbox).where(Outbox.kind == "recovery_request"))
        link = db.scalar(select(Outbox).where(Outbox.kind == "reset_link"))
        token = app.state.services.cipher.decrypt(link.payload)["token"]
        assert token not in link.payload and "user@example.com" not in link.payload
        # Simulate crash after committing the token, before acknowledging request.
        request.completed_at = None
        request.payload = app.state.services.cipher.encrypt({"email": "user@example.com"})
        db.commit()
    assert worker.once()
    assert worker.once()
    assert not worker.once()
    assert len(sent) == 1
    with Session(engine) as db:
        assert all(row.payload == "" for row in db.scalars(select(Outbox)))


def test_worker_bounded_retries_dead_letter_and_no_plaintext(client, app, engine):
    register(client)

    def fail(*args):
        raise RuntimeError("secret token must not be logged")

    worker = worker_for(app, SimpleNamespace(send=fail))
    write(client, "POST", "/api/auth/forgot-password", json={"email": "user@example.com"})
    assert worker.once()
    for _ in range(6):
        assert worker.once()
        with Session(engine) as db:
            db.execute(
                update(Outbox)
                .where(Outbox.kind == "reset_link")
                .values(available_at=utcnow() - timedelta(seconds=1))
            )
            db.commit()
    assert not worker.once()
    with Session(engine) as db:
        job = db.scalar(select(Outbox).where(Outbox.kind == "reset_link"))
        assert job.attempts == 6 and job.failed_at and not job.completed_at


def test_email_change_confirms_new_address_revokes_sessions_and_audits(client, app, engine):
    register(client)
    sent = []
    worker = worker_for(app, SimpleNamespace(send=lambda kind, payload, job: sent.append((kind, payload))))
    data = {"email": "new@example.com", "currentPassword": "wrong"}
    assert write(client, "POST", "/api/account/email", json=data).status_code == 400
    data["currentPassword"] = "test-password-12345"
    assert write(client, "POST", "/api/account/email", json=data).status_code == 202
    while worker.once():
        pass
    token = next(payload["token"] for kind, payload in sent if kind == "email_change_link")
    assert write(client, "POST", "/api/auth/confirm-email-change", json={"token": token}).status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    assert write(client, "POST", "/api/auth/confirm-email-change", json={"token": token}).status_code == 400
    with Session(engine) as db:
        assert db.scalar(select(User)).email == "new@example.com"
        assert "EMAIL_CHANGED" in list(db.scalars(select(AuditLog.event)))
