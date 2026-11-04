from uuid import uuid4

from conftest import register, write
from pydantic import SecretStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from test_management import grant

from app.infrastructure.models import CustomerRequest

KEY = "customer-request-test-key-" * 3


def body(uid=123):
    return {
        "request_key": str(uuid4()),
        "telegram_user_id": uid,
        "telegram_username": "test_customer",
        "kind": "wholesale",
        "details": {
            "name": "مشتری تست",
            "phone": "09120000000",
            "company": "فروشگاه تست",
            "items": "۱۰ گوشی و ۲۰ هدفون",
            "quantity": 30,
            "city": "تهران",
            "address": "خیابان تست، پلاک ۱۲",
            "notes": "تماس برای استعلام",
        },
    }


def submit(client, payload, key=KEY):
    return client.post(
        "/internal/telegram/customer-requests", json=payload, headers={"X-Telegram-Bot-Key": key}
    )


def test_request_registration_idempotency_and_admin_privacy(client, app, engine):
    payload = body()
    assert submit(client, payload).status_code == 401
    app.state.settings.telegram_bot_api_key = SecretStr(KEY)
    assert submit(client, payload, key="wrong").status_code == 401
    created = submit(client, payload)
    assert created.status_code == 200 and created.json()["status"] == "new"
    assert "details" not in created.json()
    assert submit(client, payload).json()["id"] == created.json()["id"]
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(CustomerRequest)) == 1
    assert client.get("/api/admin/customer-requests").status_code == 401
    register(client)
    assert client.get("/api/admin/customer-requests").status_code == 403
    grant(engine)
    row = client.get("/api/admin/customer-requests").json()["items"][0]
    assert row["details"]["address"] == payload["details"]["address"]
    assert row["telegramUserId"] == "123"
    assert client.patch("/api/admin/customer-requests/" + str(row["id"]), json={}).status_code == 400
    updated = write(
        client,
        "PATCH",
        "/api/admin/customer-requests/" + str(row["id"]),
        json={"status": "contacted", "staffNote": "یادداشت خصوصی", "version": 1},
    )
    assert updated.status_code == 200 and updated.json()["version"] == 2
    stale = write(
        client,
        "PATCH",
        "/api/admin/customer-requests/" + str(row["id"]),
        json={"status": "new", "staffNote": "", "version": 1},
    )
    assert stale.status_code == 409
    tracking = client.get(
        "/internal/telegram/customer-requests/123", headers={"X-Telegram-Bot-Key": KEY}
    ).json()
    assert tracking["items"][0]["status"] == "contacted"
    assert "یادداشت خصوصی" not in str(tracking) and "details" not in tracking["items"][0]
    assert (
        client.get("/internal/telegram/customer-requests/456", headers={"X-Telegram-Bot-Key": KEY}).json()[
            "items"
        ]
        == []
    )
    changed = body(456)
    changed["request_key"] = payload["request_key"]
    assert submit(client, changed).status_code == 409


def test_read_only_operator_cannot_update_and_inputs_are_validated(client, app, engine):
    app.state.settings.telegram_bot_api_key = SecretStr(KEY)
    payload = body()
    payload["details"]["phone"] = "bad"
    assert submit(client, payload).status_code == 400
    payload = body()
    payload["details"]["quantity"] = 0
    assert submit(client, payload).status_code == 400
    payload = body()
    payload["details"]["address"] = "x"
    assert submit(client, payload).status_code == 400
    created = submit(client, body()).json()
    register(client)
    grant(engine, permissions=("admin:access", "orders:read"))
    assert client.get("/api/admin/customer-requests").status_code == 200
    assert (
        write(
            client,
            "PATCH",
            "/api/admin/customer-requests/" + str(created["id"]),
            json={"status": "closed", "staffNote": "", "version": 1},
        ).status_code
        == 403
    )
