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


def message_for(text='', uid=123):
    return SimpleNamespace(from_user=SimpleNamespace(id=uid, first_name='Test'), text=text,
                           answer=AsyncMock(), answer_photo=AsyncMock())


def state_for():
    return SimpleNamespace(clear=AsyncMock(), get_state=AsyncMock(return_value=None), set_state=AsyncMock())


def buttons(message):
    return [b.text for row in message.answer.call_args.kwargs['reply_markup'].keyboard for b in row]


async def test_category_then_product_full_details_and_back(handler):
    from keyboards import product_label
    from texts import tr
    phone = Product('phone', 'گوشی تست', 2, raw={'category': 'smartphones', 'categoryFa': 'گوشی هوشمند',
                      'specs': ['۸ گیگابایت رم', '۲۵۶ گیگابایت حافظه']}, description='توضیح کامل ' * 200)
    laptop = Product('laptop', 'Laptop', 3, raw={'category': 'laptops'})
    handler.client.get_products.return_value = [phone, laptop]
    start = message_for('/start')
    await handler.cmd_start(start, state_for())
    assert start.answer.call_args.kwargs['reply_markup'].inline_keyboard[0][0].callback_data == 'menu:start'
    await handler.cb_begin(handler.reply_callback(start, 'menu:start'), state_for())
    category = next(x for x in buttons(start) if 'گوشی هوشمند' in x)
    assert phone.name not in buttons(start)
    handler.client.get_products.return_value = [phone]
    choose = message_for(category)
    await handler.any_message(choose, state_for())
    handler.client.get_products.assert_awaited_with(category='smartphones')
    assert product_label(phone, 0) in buttons(choose)
    handler.client.get_product.return_value = phone
    detail = message_for(product_label(phone, 0))
    await handler.any_message(detail, state_for())
    text = ''.join(call.args[0] for call in detail.answer.call_args_list)
    assert phone.description in text and '۸ گیگابایت رم' in text
    assert all(len(c.args[0].encode('utf-16-le')) // 2 <= 4096 for c in detail.answer.call_args_list)
    back = message_for(tr('fa', 'btn_back_products'))
    await handler.reply_navigation(back, state_for())
    assert product_label(phone, 0) in buttons(back)


async def test_compare_keeps_selection_across_category_navigation(handler):
    from keyboards import product_label
    from texts import tr
    phones = [Product(str(i), f'Phone {i}', i + 1, raw={'category': 'smartphones', 'specs': ['OLED']}) for i in range(4)]
    handler.client.get_products.return_value = phones
    await handler.reply_navigation(message_for(tr('fa', 'btn_compare')), state_for())
    category = next(iter(handler._category_choices[123]))
    await handler.any_message(message_for(category), state_for())
    for index in [0, 1]:
        await handler.any_message(message_for(product_label(phones[index], index, handler._compare[123])), state_for())
    assert handler._compare[123] == {'0', '1'}
    await handler.reply_navigation(message_for(tr('fa', 'btn_categories')), state_for())
    assert handler._compare[123] == {'0', '1'}
    handler.client.get_product.side_effect = lambda pid, **kw: next(p for p in phones if p.id == pid)
    result = message_for(tr('fa', 'btn_compare_show'))
    await handler.reply_navigation(result, state_for())
    assert 'Phone 0' in result.answer.call_args.args[0] and 'OLED' in result.answer.call_args.args[0]


async def test_menu_buttons_cancel_search_and_restart_recovers_navigation(handler):
    from texts import tr
    phone = Product('1', 'Phone', raw={'category': 'smartphones'})
    handler.client.get_products.return_value = [phone]
    state = state_for()
    message = message_for(tr('fa', 'btn_products'))
    await handler.reply_navigation(message, state)
    state.clear.assert_awaited_once()
    assert any('گوشی هوشمند' in text for text in buttons(message))
    handler._products_cache.clear()
    message = message_for(tr('fa', 'btn_next'))
    await handler.reply_navigation(message, state)
    assert any('گوشی هوشمند' in text for text in buttons(message))


async def test_user_category_state_is_isolated(handler):
    phone = Product('1', 'Phone', raw={'category': 'smartphones'})
    handler.client.get_products.return_value = [phone]
    await handler.show_categories(message_for(), 'fa', 123)
    assert 456 not in handler._category_choices
    message = message_for(next(iter(handler._category_choices[123])), uid=456)
    await handler.any_message(message, state_for())
    assert 456 not in handler._products_cache


async def test_failed_photo_does_not_truncate_specifications(handler):
    product = Product('p', 'Product', 1, image='https://shop.test/photo.jpg',
                      description='😀' * 5000, raw={'specs': ['last specification']})
    message = message_for()
    message.answer_photo.side_effect = RuntimeError('photo unavailable')
    await handler.show_product(message, 123, product)
    text = ''.join(c.args[0] for c in message.answer.call_args_list)
    assert product.description in text and 'last specification' in text
    assert all(len(c.args[0].encode('utf-16-le')) // 2 <= 4096 for c in message.answer.call_args_list)


async def test_real_dispatcher_category_navigation_search_cancel_and_language(handler):
    from datetime import datetime, timezone

    from aiogram import Bot, Dispatcher
    from aiogram.client.session.base import BaseSession
    from aiogram.types import Message, Update, User
    from texts import tr

    class SessionStub(BaseSession):
        def __init__(self):
            super().__init__()
            self.sent = []

        async def close(self):
            pass

        async def make_request(self, bot, method, timeout=None):
            self.sent.append(method)
            return Message(message_id=20, date=datetime.now(timezone.utc), chat={'id': 123, 'type': 'private'},
                           text=getattr(method, 'text', ''))

        async def stream_content(self, *args, **kwargs):
            yield b''

    phone = Product('p', 'Phone', 2, raw={'category': 'smartphones', 'specs': ['OLED screen']})
    laptop = Product('l', 'Laptop', 3, raw={'category': 'laptops'})
    async def catalogue(query=None, category=None):
        products = [phone, laptop]
        if category:
            products = [p for p in products if p.raw['category'] == category]
        return products
    handler.client.get_products.side_effect = catalogue
    handler.client.get_product.return_value = phone
    session = SessionStub()
    bot = Bot('123456:fake-test-token', session=session)
    bot._me = User(id=123456, is_bot=True, first_name='Nexora', username='NexoraTestBot')
    dispatcher = Dispatcher()
    dispatcher.include_router(handler.router)
    update_id = 0
    async def send(text):
        nonlocal update_id
        update_id += 1
        await dispatcher.feed_update(bot, Update.model_validate({'update_id': update_id, 'message': {
            'message_id': update_id, 'date': 1700000000, 'from': {'id': 123, 'is_bot': False, 'first_name': 'Test'},
            'chat': {'id': 123, 'type': 'private'}, 'text': text}}))
    try:
        await send('/start')
        assert session.sent[-1].reply_markup.inline_keyboard[0][0].callback_data == 'menu:start'
        await dispatcher.feed_update(bot, Update.model_validate({'update_id': 99, 'callback_query': {
            'id': 'start-click', 'chat_instance': 'test', 'from': {'id': 123, 'is_bot': False, 'first_name': 'Test'},
            'data': 'menu:start', 'message': {'message_id': 20, 'date': 1700000000,
                'chat': {'id': 123, 'type': 'private'}, 'text': 'Welcome'}
        }}))
        category = next(b.text for row in session.sent[-1].reply_markup.keyboard for b in row if 'گوشی' in b.text)
        await send(category)
        menu = next(method for method in reversed(session.sent) if method.__api_method__ == 'sendMessage')
        labels = [b.text for row in menu.reply_markup.keyboard for b in row]
        assert '1. Phone' in labels and not any('Laptop' in label for label in labels)
        await send('1. Phone')
        assert 'OLED screen' in session.sent[-1].text
        await send(tr('fa', 'btn_search'))
        # A bottom menu button must cancel search, not search for its own label.
        await send(tr('fa', 'btn_products'))
        assert any('گوشی' in b.text for row in session.sent[-1].reply_markup.keyboard for b in row)
        assert handler.client.get_products.call_args.kwargs == {}
        await send(tr('fa', 'btn_language'))
        await send('🇬🇧 English')
        assert handler.store.get_lang(123) == 'en'
        assert any(b.text == tr('en', 'btn_products') for row in session.sent[-1].reply_markup.keyboard for b in row)
        await send(tr('en', 'btn_products'))
        assert any('Smartphones' in b.text for row in session.sent[-1].reply_markup.keyboard for b in row)
    finally:
        await dispatcher.storage.close()
        await bot.session.close()


async def test_comparison_rejects_other_categories_and_can_clear(handler):
    from texts import tr
    phone = Product('p', 'Phone', raw={'category': 'smartphones'})
    laptop = Product('l', 'Laptop', raw={'category': 'laptops'})
    handler._compare[123] = {'p'}
    handler._compare_products[123] = {'p': phone}
    handler._products_cache[123] = [laptop]
    message = message_for()
    await handler.cb_compare_toggle(handler.reply_callback(message, 'cmp:toggle:l'))
    assert handler._compare[123] == {'p'}
    assert message.answer.call_args.args[0] == tr('fa', 'compare_category')
    await handler.reply_navigation(message_for(tr('fa', 'btn_compare_clear')), state_for())
    assert handler._compare[123] == set() and handler._compare_products[123] == {}


async def test_category_photo_uses_local_asset_and_falls_back_safely(handler):
    from pathlib import Path

    from aiogram.types import FSInputFile
    message = message_for()
    await handler.show_category_photo(message, 'smartphones')
    photo = message.answer_photo.call_args.args[0]
    assert isinstance(photo, FSInputFile)
    assert Path(photo.path).name == 'smartphones.png'
    await handler.show_category_photo(message, '../../private')
    assert Path(message.answer_photo.call_args.args[0].path).name == 'more.png'
    message.answer_photo.side_effect = RuntimeError('network error')
    await handler.show_category_photo(message, 'smartphones')


async def test_start_callback_opens_category_menu(handler):
    handler.client.get_products.return_value = [Product('p', 'Phone', raw={'category': 'smartphones'})]
    message = message_for('/start')
    await handler.cmd_start(message, state_for())
    assert message.answer.call_args.kwargs['reply_markup'].inline_keyboard
    await handler.cb_begin(handler.reply_callback(message, 'menu:start'), state_for())
    assert any('گوشی' in b for b in buttons(message))
