import re
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock

from conftest import register, write
from pydantic import SecretStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from test_customer_requests import KEY, body, submit
from test_management import grant

from app.infrastructure.models import CustomerDelivery, utcnow
from app.infrastructure.wholesale_delivery import WholesaleDelivery


def setup(client, app, engine):
    app.state.settings.telegram_bot_api_key = SecretStr(KEY)
    request = submit(client, body()).json()
    register(client)
    grant(engine)
    return request["id"]


def approve(client, rid, version=1):
    return write(
        client,
        "POST",
        f"/api/admin/customer-requests/{rid}/approve",
        json={
            "version": version,
            "lines": [{"name": "گوشی هوشمند", "quantity": 30, "unitPriceRial": 25000000}],
            "shippingRial": 1000000,
            "terms": "ارسال پس از هماهنگی",
        },
    )


def test_approval_creates_one_immutable_pdf_and_unique_tracking_code(client, app, engine):
    rid = setup(client, app, engine)
    assert approve(client, rid).status_code == 503
    app.state.settings.telegram_bot_token = SecretStr("123456:fake-token-for-tests")
    assert (
        write(
            client, "PATCH", f"/api/admin/customer-requests/{rid}", json={"status": "approved", "version": 1}
        ).status_code
        == 400
    )
    response = approve(client, rid)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "approved" and re.fullmatch(r"[1-9][0-9]{7}", data["trackingCode"])
    assert data["invoice"]["totalRial"] == "751000000"
    pdf = client.get(f"/api/admin/customer-requests/{rid}/invoice")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF-")
    assert pdf.headers["content-type"] == "application/pdf"
    assert approve(client, rid).json()["trackingCode"] == data["trackingCode"]
    assert client.get(f"/api/admin/customer-requests/{rid}/invoice").content == pdf.content
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(CustomerDelivery)) == 1
    owner = client.get(
        f"/internal/telegram/customer-requests/123/{rid}/invoice", headers={"X-Telegram-Bot-Key": KEY}
    )
    assert owner.content == pdf.content
    assert (
        client.get(
            f"/internal/telegram/customer-requests/999/{rid}/invoice", headers={"X-Telegram-Bot-Key": KEY}
        ).status_code
        == 404
    )
    other = submit(client, body(456)).json()["id"]
    assert approve(client, other).json()["trackingCode"] != data["trackingCode"]
    stats = client.get("/api/admin/customer-request-stats").json()
    assert stats["total"] == 2 and len(stats["daily"]) == 30 and stats["statuses"]["approved"] == 2


def test_durable_delivery_retries_and_sends_exact_admin_document(client, app, engine):
    rid = setup(client, app, engine)
    app.state.settings.telegram_bot_token = SecretStr("123456:fake-token-for-tests")
    data = approve(client, rid).json()
    expected = client.get(f"/api/admin/customer-requests/{rid}/invoice").content
    sender = SimpleNamespace(
        configured=True, send=Mock(side_effect=RuntimeError("temporary network failure"))
    )
    worker = WholesaleDelivery(engine, sender)
    assert worker.once() is True
    with Session(engine) as db, db.begin():
        delivery = db.get(CustomerDelivery, rid)
        assert delivery.sent_at is None and delivery.attempts == 1
        delivery.available_at = utcnow() - timedelta(seconds=1)
    sender.send.side_effect = None
    sender.send.return_value = 777
    assert worker.once() is True
    sender.send.assert_called_with(123, data["trackingCode"], expected)
    assert worker.once() is False
    with Session(engine) as db:
        delivery = db.get(CustomerDelivery, rid)
        assert delivery.sent_at is not None and delivery.message_id == 777
    assert write(client, "POST", f"/api/admin/customer-requests/{rid}/retry-delivery").status_code == 409


def test_read_only_admin_cannot_approve_and_missing_service_key_fails_closed(client, app, engine):
    app.state.settings.telegram_bot_api_key = SecretStr(KEY)
    rid = submit(client, body()).json()["id"]
    register(client)
    grant(engine, permissions=("admin:access", "orders:read"))
    app.state.settings.telegram_bot_token = SecretStr("123456:fake-token-for-tests")
    assert approve(client, rid).status_code == 403
    assert client.get("/internal/telegram/customer-requests/health").status_code == 401
    assert (
        client.get("/internal/telegram/customer-requests/health", headers={"X-Telegram-Bot-Key": KEY}).json()[
            "status"
        ]
        == "ready"
    )


def test_tracking_collision_retries_and_parallel_approval_is_idempotent(client, app, engine, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor

    from app.infrastructure.customer_requests import CustomerRequests

    rid = setup(client, app, engine)
    app.state.settings.telegram_bot_token = SecretStr("123456:fake-token-for-tests")
    monkeypatch.setattr("app.infrastructure.customer_requests.secrets.randbelow", lambda upper: 0)
    assert approve(client, rid).json()["trackingCode"] == "10000000"
    other = submit(client, body(456)).json()["id"]
    values = iter([0, 1])
    monkeypatch.setattr("app.infrastructure.customer_requests.secrets.randbelow", lambda upper: next(values))
    assert approve(client, other).json()["trackingCode"] == "10000001"
    if engine.dialect.name != "postgresql":
        return
    third = submit(client, body(789)).json()["id"]
    monkeypatch.setattr("app.infrastructure.customer_requests.secrets.randbelow", lambda upper: 99)
    service = CustomerRequests(engine)
    args = (third, 1, 1, [{"name": "Test", "quantity": 2, "unitPriceRial": 1000}], 0, "")
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: service.approve(*args), range(2)))
    assert results[0]["trackingCode"] == results[1]["trackingCode"]
    with Session(engine) as db:
        assert (
            db.scalar(
                select(func.count()).select_from(CustomerDelivery).where(CustomerDelivery.request_id == third)
            )
            == 1
        )
