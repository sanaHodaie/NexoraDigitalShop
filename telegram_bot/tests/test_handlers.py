from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from api_client import Product
from config import load_config
from handlers import NexoraHandlers, fmt_price
from settings_store import SettingsStore


@pytest.fixture
def handler(tmp_path, monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", "123456:fake-test-token")
    monkeypatch.setenv("TELEGRAM_BOT_API_KEY", "service-key-for-tests")
    return NexoraHandlers(load_config(), AsyncMock(), SettingsStore(str(tmp_path)))


async def test_start_uses_actual_sender_and_requires_backend_success(handler):
    message = SimpleNamespace(from_user=SimpleNamespace(id=123, first_name="Test"),
                              text="/start " + "a" * 43, answer=AsyncMock())
    handler.client.complete_telegram_direct_link.return_value = {"linked": True}
    await handler.cmd_start(message, AsyncMock())
    handler.client.complete_telegram_direct_link.assert_awaited_once_with(token="a" * 43, telegram_user_id=123)
    assert "✅" in message.answer.call_args.args[0]
    handler.client.complete_telegram_direct_link.return_value = {"linked": False}
    await handler.cmd_start(message, AsyncMock())
    assert "✅" not in message.answer.call_args.args[0]


async def test_product_refreshes_price_before_showing(handler):
    handler._products_cache[123] = [Product("x", "old", 1)]
    handler.client.get_product.return_value = Product("x", "new", 2)
    cb = SimpleNamespace(from_user=SimpleNamespace(id=123), data="prod:x", answer=AsyncMock(),
                         message=SimpleNamespace(answer=AsyncMock()))
    await handler.cb_product(cb)
    handler.client.get_product.assert_awaited_once()
    assert "1,200,000" in cb.message.answer.call_args.args[0]


async def test_compare_cap_and_comparison_pagination(handler):
    handler._products_cache[123] = [Product(str(i), str(i)) for i in range(8)]
    handler._compare[123] = {"0", "1", "2"}
    cb = SimpleNamespace(from_user=SimpleNamespace(id=123), data="cmp:toggle:3", answer=AsyncMock())
    await handler.cb_compare_toggle(cb)
    assert len(handler._compare[123]) == 3
    handler._compare_mode[123] = True
    handler._show_products_page = AsyncMock()
    cb.data = "page:1"
    cb.message = SimpleNamespace()
    await handler.cb_page(cb)
    assert handler._show_products_page.call_args.kwargs["compare_mode"] is True


def test_price_matches_storefront_rial_rate():
    assert fmt_price(1.25) == "750,000"
    assert fmt_price(None) == "—"


async def test_dispatcher_routes_updates_and_ignores_groups(handler):
    from datetime import datetime, timezone

    from aiogram import Bot, Dispatcher
    from aiogram.client.session.base import BaseSession
    from aiogram.types import Message, Update, User

    class TelegramStub(BaseSession):
        def __init__(self):
            super().__init__()
            self.sent = []

        async def close(self):
            pass

        async def make_request(self, bot, method, timeout=None):
            self.sent.append(method)
            return Message(message_id=2, date=datetime.now(timezone.utc),
                           chat={"id": 123, "type": "private"}, text=getattr(method, "text", ""))

        async def stream_content(self, *args, **kwargs):
            yield b""

    session = TelegramStub()
    bot = Bot("123456:fake-test-token", session=session)
    bot._me = User(id=123456, is_bot=True, first_name="Nexora", username="NexoraTestBot")
    dispatcher = Dispatcher()
    dispatcher.include_router(handler.router)
    message = {"message_id": 1, "date": 1700000000,
               "from": {"id": 123, "is_bot": False, "first_name": "Test"},
               "chat": {"id": 123, "type": "private"}, "text": "/start"}
    try:
        await dispatcher.feed_update(bot, Update.model_validate({"update_id": 1, "message": message}))
        assert len(session.sent) == 1
        assert session.sent[0].reply_markup is not None
        message["chat"] = {"id": -100123, "type": "supergroup", "title": "Test"}
        message["text"] = "/start " + "a" * 43
        await dispatcher.feed_update(bot, Update.model_validate({"update_id": 2, "message": message}))
        assert len(session.sent) == 1
        handler.client.complete_telegram_direct_link.assert_not_awaited()
    finally:
        await dispatcher.storage.close()
        await bot.session.close()
