from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from api_client import ApiNetworkError
from config import load_config
from customer_support import COPY, CustomerFlow
from handlers import NexoraHandlers
from settings_store import SettingsStore


class State:
    def __init__(self):
        self.data = {}
        self.state = None

    async def get_data(self):
        return self.data.copy()

    async def set_data(self, data):
        self.data = data

    async def set_state(self, state):
        self.state = state

    async def clear(self):
        self.state = None
        self.data = {}


def message(text):
    return SimpleNamespace(
        text=text,
        from_user=SimpleNamespace(id=123, first_name="Test", username="test_customer"),
        answer=AsyncMock(),
    )


@pytest.fixture
def handler(tmp_path, monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", "123456:fake-test-token")
    return NexoraHandlers(load_config(), AsyncMock(), SettingsStore(str(tmp_path)))


async def filled(handler):
    state = State()
    await handler.crm_navigation(message(COPY["fa"]["wholesale"]), state)
    for value in [
        "مشتری تست",
        "۰۹۱۲۱۲۳۴۵۶۷",
        "فروشگاه تست",
        "گوشی هوشمند و هدفون",
        "۳۰",
        "تهران",
        "خیابان نمونه پلاک ۱۲",
        "تعداد هر قلم هنگام تماس مشخص می‌شود",
    ]:
        await handler.crm_collect(message(value), state)
    return state


async def test_wholesale_review_confirmation_and_retry_keeps_idempotency(handler):
    state = await filled(handler)
    assert state.state == CustomerFlow.review
    assert state.data["details"]["phone"] == "09121234567"
    assert state.data["details"]["quantity"] == 30
    handler.client.create_customer_request.assert_not_awaited()
    key = state.data["request_key"]
    handler.client.create_customer_request.side_effect = ApiNetworkError("offline")
    failed = message(COPY["fa"]["confirm"])
    await handler.crm_submit(failed, state)
    assert (
        state.data["request_key"] == key
        and "ثبت درخواست تأیید نشد" in failed.answer.call_args.args[0]
    )
    handler.client.create_customer_request.side_effect = None
    handler.client.create_customer_request.return_value = {"id": 42}
    success = message(COPY["fa"]["confirm"])
    await handler.crm_submit(success, state)
    assert "42" in success.answer.call_args.args[0] and state.state is None
    payload = handler.client.create_customer_request.call_args.args[0]
    assert payload["telegram_user_id"] == 123 and payload["request_key"] == key
    assert payload["details"]["address"] == "خیابان نمونه پلاک ۱۲"


async def test_invalid_quantity_stays_in_form_and_cancel_does_not_submit(handler):
    state = State()
    await handler.crm_navigation(message(COPY["fa"]["wholesale"]), state)
    for text in ["مشتری", "09121234567", "-", "گوشی"]:
        await handler.crm_collect(message(text), state)
    await handler.crm_collect(message("0"), state)
    assert state.data["step"] == 4
    await handler.crm_navigation(message(COPY["fa"]["cancel"]), state)
    handler.client.create_customer_request.assert_not_awaited()
    assert state.state is None


async def test_tracking_uses_actual_sender_and_main_menu_avoids_catalogue(handler):
    from keyboards import main_menu_kb

    labels = [b.text for row in main_menu_kb("fa").keyboard for b in row]
    assert COPY["fa"]["wholesale"] in labels and COPY["fa"]["faq"] in labels
    assert not any("مقایسه" in label for label in labels)
    handler.client.customer_requests.return_value = {
        "items": [{"id": 42, "kind": "wholesale", "status": "contacted"}]
    }
    result = message(COPY["fa"]["mine"])
    await handler.crm_navigation(result, State())
    handler.client.customer_requests.assert_awaited_once_with(123)
    assert "تماس گرفته شد" in result.answer.call_args.args[0]


async def test_missing_shared_key_is_actionable_and_invoice_download_uses_sender(
    handler,
):
    from api_client import ApiConfigurationError

    state = await filled(handler)
    handler.client.create_customer_request.side_effect = ApiConfigurationError(
        "missing"
    )
    failed = message(COPY["fa"]["confirm"])
    await handler.crm_submit(failed, state)
    assert "کلید مشترک" in failed.answer.call_args.args[0] and state.state is not None
    pdf = b"%PDF-test-exact-bytes"
    handler.client.customer_invoice.return_value = pdf
    response = SimpleNamespace(answer=AsyncMock(), answer_document=AsyncMock())
    cb = SimpleNamespace(
        answer=AsyncMock(),
        data="invoice:42",
        from_user=SimpleNamespace(id=123),
        message=response,
    )
    await handler.crm_invoice(cb)
    handler.client.customer_invoice.assert_awaited_once_with(123, 42)
    assert response.answer_document.call_args.args[0].data == pdf
