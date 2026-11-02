from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

from conftest import register, write
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import TelegramLink, TelegramLinkChallenge, utcnow

KEY = "telegram-test-service-key-" * 2


def configure(app):
    app.state.settings.telegram_bot_api_key = __import__('pydantic').SecretStr(KEY)
    app.state.settings.telegram_bot_username = "NexoraTestBot"


def issue(client):
    result = write(client, "POST", "/api/account/telegram/link")
    assert result.status_code == 200
    assert result.headers["cache-control"] == "no-store"
    return parse_qs(urlsplit(result.json()["url"]).query)["start"][0]


def confirm(client, token, uid=1234567890123, key=KEY):
    return client.post("/internal/telegram/link-confirmations",
        json={"token": token, "telegram_user_id": uid}, headers={"X-Telegram-Bot-Key": key})


def test_link_auth_csrf_confirmation_replay_and_unlink(client, app, engine):
    configure(app)
    assert write(client, "POST", "/api/account/telegram/link").status_code == 401
    register(client)
    assert client.post("/api/account/telegram/link").status_code == 400
    assert client.delete("/api/account/telegram").status_code == 400
    token = issue(client)
    with Session(engine) as db:
        challenge = db.scalar(select(TelegramLinkChallenge))
        assert challenge.token_hash != token and len(challenge.token_hash) == 64
    assert confirm(client, token, key="wrong").status_code == 401
    assert confirm(client, token).json() == {"linked": True}
    assert confirm(client, token).status_code == 400
    assert client.get("/api/account/telegram").json()["linked"] is True
    assert write(client, "DELETE", "/api/account/telegram").status_code == 204
    assert client.get("/api/account/telegram").json()["linked"] is False
    with Session(engine) as db:
        assert db.scalar(select(TelegramLink)) is None


def test_expiry_reissue_invalid_ids_and_fail_closed(client, app, engine):
    register(client)
    assert write(client, "POST", "/api/account/telegram/link").status_code == 503
    assert confirm(client, "a" * 43).status_code == 401
    configure(app)
    old = issue(client)
    new = issue(client)
    assert confirm(client, old).status_code == 400
    assert confirm(client, new, uid=True).status_code == 400
    assert confirm(client, new, uid=0).status_code == 400
    with Session(engine) as db:
        challenge = db.scalar(select(TelegramLinkChallenge))
        challenge.expires_at = utcnow() - timedelta(seconds=1)
        db.commit()
    assert confirm(client, new).status_code == 400


def test_conflicting_telegram_identity_and_user_isolation(client, app):
    configure(app)
    register(client)
    assert confirm(client, issue(client), uid=123).status_code == 200
    write(client, "POST", "/api/auth/logout")
    register(client, email="other@example.com")
    assert client.get("/api/account/telegram").json()["linked"] is False
    assert confirm(client, issue(client), uid=123).status_code == 409
    assert write(client, "DELETE", "/api/account/telegram").status_code == 204
    write(client, "POST", "/api/auth/logout")
    from conftest import write as login_write
    response = login_write(client, "POST", "/api/auth/login",
        json={"email": "user@example.com", "password": "test-password-12345"})
    assert response.status_code == 200
    assert client.get("/api/account/telegram").json()["linked"] is True


def test_concurrent_confirmation_consumes_token_once(client, app, engine):
    from concurrent.futures import ThreadPoolExecutor

    from app.domain.errors import BusinessError
    from app.infrastructure.telegram_linking import TelegramLinking

    if engine.dialect.name != "postgresql":
        __import__('pytest').skip("Row-lock concurrency requires PostgreSQL")
    configure(app)
    register(client)
    token = issue(client)

    def attempt(uid):
        try:
            TelegramLinking(engine).confirm(token, uid)
            return 200
        except BusinessError as exc:
            return exc.status

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(attempt, [111, 222]))
    assert sorted(results) == [200, 400]
