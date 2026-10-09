import json
import logging
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.logging import SafeFormatter, redact
from app.infrastructure.rate_limit import enforce
from app.main import create_app


@pytest.mark.parametrize(
    "message",
    [
        "password=hidden-value",
        "reset_token=hidden-value",
        '{"currentPassword":"hidden-value"}',
        "{'token': 'hidden-value'}",
        "Authorization: Bearer hidden-value",
        "postgresql+psycopg://user:hidden-value@db/prod",
        "rediss://:hidden-value@host:6379",
    ],
)
def test_secret_redaction(message):
    assert "hidden-value" not in redact(message)


def test_exception_formatter_omits_exception_details():
    record = logging.LogRecord(
        "test",
        logging.ERROR,
        "",
        1,
        "Operation failed",
        (),
        (RuntimeError, RuntimeError("hidden-value"), None),
    )
    assert "hidden-value" not in SafeFormatter().format(record)
    assert json.loads(SafeFormatter().format(record))["message"] == "Operation failed"


def test_exact_cors_and_central_exceptions(engine, settings):
    settings.allowed_origins = ["https://shop.test"]
    app = create_app(settings, engine)

    @app.get("/api/test-error")
    def failure():
        raise RuntimeError("password=hidden-value")

    with TestClient(app, base_url="https://shop.test") as client:
        allowed = client.options(
            "/api/account/profile",
            headers={
                "Origin": "https://shop.test",
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": "X-CSRF-TOKEN",
            },
        )
        assert allowed.status_code == 200
        assert allowed.headers["access-control-allow-origin"] == "https://shop.test"
        denied = client.options(
            "/api/account/profile",
            headers={"Origin": "https://evil.test", "Access-Control-Request-Method": "PATCH"},
        )
        assert "access-control-allow-origin" not in denied.headers
        failure = client.get("/api/test-error")
        assert failure.status_code == 500 and "hidden-value" not in failure.text
        assert failure.headers["x-content-type-options"] == "nosniff"


def test_forwarded_ip_ignores_spoofed_leftmost_hop(settings):
    from app.infrastructure.rate_limit import bucket

    settings.trusted_proxy_header = "x-forwarded-for"
    settings.trusted_proxy_peers = ["10.0.0.0/8"]
    keys = []
    limiter = SimpleNamespace(allow=lambda key, count: keys.append(key) or True)
    request = SimpleNamespace(
        app=SimpleNamespace(state=SimpleNamespace(settings=settings, limiter=limiter)),
        client=SimpleNamespace(host="10.0.0.1"),
        headers={"x-forwarded-for": "1.1.1.1, 203.0.113.9"},
    )
    enforce(request, "login")
    assert keys[0] == bucket(settings, "login:ip", "203.0.113.9")
    request.client.host = "203.0.113.5"
    enforce(request, "login")
    assert keys[-1] == bucket(settings, "login:ip", "203.0.113.5")


def test_production_rejects_missing_redis_and_wildcard_origin():
    with pytest.raises(ValueError):
        Settings(environment="production", secret_key="x" * 48, frontend_url="https://shop.test")
    with pytest.raises(ValueError):
        Settings(allowed_origins=["*"])


def test_all_mutating_api_routes_require_csrf(client):
    paths = [
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/logout-all",
        "/api/auth/google",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/request-verification",
        "/api/auth/verify-email",
        "/api/auth/confirm-email-change",
        "/api/account/password",
        "/api/account/email",
        "/api/account/orders",
        "/api/account/orders/1/cancel",
        "/api/management/orders/1/confirm-payment",
        "/api/newsletter",
    ]
    for path in paths:
        assert client.post(path, json={}).json()["code"] == "INVALID_CSRF", path
    for method, path in [
        ("PATCH", "/api/account/profile"),
        ("PUT", "/api/account/cart/p"),
        ("DELETE", "/api/account/cart"),
        ("PUT", "/api/account/wishlist/p"),
        ("DELETE", "/api/account/wishlist/p"),
    ]:
        assert client.request(method, path, json={}).json()["code"] == "INVALID_CSRF"
