import asyncio
import os
import secrets
from datetime import datetime, timezone

import httpx
import psycopg
import pytest
from aiogram import Bot
from aiogram.client.session.base import BaseSession
from aiogram.types import Message, Update, User
from api_client import NexoraClient
from config import load_config
from postgres_store import SCHEMA_SQL, PostgresStore
from texts import tr
from webhook_app import Runtime


@pytest.fixture
def store():
    url = os.getenv('BOT_TEST_DATABASE_URL')
    if not url:
        pytest.skip('Set BOT_TEST_DATABASE_URL to a dedicated test database')
    with psycopg.connect(url) as connection:
        connection.execute(SCHEMA_SQL)
    store = PostgresStore(url, secrets.randbits(48))
    yield store
    with psycopg.connect(url) as connection:
        for table in ('processed_updates', 'user_state', 'media'):
            connection.execute(f'DELETE FROM nexora_bot.{table} WHERE bot_id=%s', (store.bot_id,))


async def test_dedup_rollback_and_simultaneous_user_updates(store):
    async with store.update(123, 1) as tx:
        await tx.save({'version': 1, 'language': 'en', 'count': 1})
    async with store.update(123, 1) as tx:
        assert tx is None
    with pytest.raises(RuntimeError):
        async with store.update(123, 2) as tx:
            await tx.save({'count': 99})
            raise RuntimeError('simulate Telegram failure')
    async with store.update(123, 2) as tx:
        assert (await tx.load())['count'] == 1
    async def increment(update_id):
        async with store.update(123, update_id) as tx:
            data = await tx.load()
            await asyncio.sleep(.05)
            data['count'] += 1
            await tx.save(data)
    await asyncio.gather(increment(3), increment(4))
    async with store.update(123, 5) as tx:
        assert (await tx.load())['count'] == 3


class TelegramSession(BaseSession):
    def __init__(self, sent):
        super().__init__()
        self.sent = sent

    async def close(self):
        pass

    async def make_request(self, bot, method, timeout=None):
        self.sent.append(method)
        if method.__api_method__ == 'answerCallbackQuery':
            return True
        data = {'message_id': 10, 'date': datetime.now(timezone.utc),
                'chat': {'id': 123, 'type': 'private'}, 'text': getattr(method, 'text', None)}
        if method.__api_method__ == 'sendPhoto':
            data['photo'] = [{'file_id': 'persistent-photo-id', 'file_unique_id': 'photo', 'width': 100, 'height': 100}]
        return Message(**data)

    async def stream_content(self, *args, **kwargs):
        yield b''


async def test_cold_start_navigation_search_language_and_photo_cache(store, monkeypatch):
    monkeypatch.setenv('BOT_TOKEN', '123456:fake-test-token')
    monkeypatch.setenv('NEXORA_API_URL', 'https://shop.test')
    products = [{'id': 'p', 'name': 'Phone', 'price': 2, 'category': 'smartphones', 'specs': ['OLED']},
                {'id': 'p2', 'name': 'Phone 2', 'price': 3, 'category': 'smartphones'}]
    sent, requests = [], []
    def api(request):
        requests.append(request)
        return httpx.Response(200, json=products[0] if request.url.path.endswith('/p') else products)
    counter = 0
    async def deliver(text=None, callback=None, uid=123, repeat=False):
        nonlocal counter
        if not repeat:
            counter += 1
        payload = {'update_id': counter}
        user = {'id': uid, 'is_bot': False, 'first_name': 'Test'}
        message = {'message_id': counter, 'date': 1700000000, 'chat': {'id': uid, 'type': 'private'},
                   'from': user, 'text': text or 'Welcome'}
        if callback:
            payload['callback_query'] = {'id': str(counter), 'from': user, 'chat_instance': 'chat',
                                          'message': message, 'data': callback}
        else:
            payload['message'] = message
        # New runtime, client, dispatcher and language store for EVERY update.
        runtime = Runtime.__new__(Runtime)
        runtime.cfg, runtime.store = load_config(), store
        runtime.bot = Bot(runtime.cfg.bot_token, session=TelegramSession(sent))
        runtime.bot._me = User(id=123456, is_bot=True, first_name='Nexora', username='NexoraTestBot')
        runtime.client = NexoraClient('https://shop.test', product_detail_path='/api/products/{id}')
        await runtime.client.aclose()
        runtime.client._client = httpx.AsyncClient(transport=httpx.MockTransport(api), base_url='https://shop.test')
        try:
            await runtime.process(Update.model_validate(payload))
        finally:
            await runtime.close()
    def last_text():
        return next(method for method in reversed(sent) if method.__api_method__ == 'sendMessage')
    await deliver('/start')
    await deliver(callback='menu:start')
    category = next(button.text for row in last_text().reply_markup.keyboard for button in row if 'گوشی' in button.text)
    await deliver(category)
    # Usable product menu precedes potentially slow image transfer.
    assert sent[-2].__api_method__ == 'sendMessage' and sent[-1].__api_method__ == 'sendPhoto'
    await deliver('1. Phone')
    assert 'OLED' in last_text().text
    await deliver(tr('fa', 'btn_add_compare'))
    await deliver('2. Phone 2')
    await deliver(tr('fa', 'btn_compare_show'))
    assert 'Phone 2' in last_text().text
    await deliver(tr('fa', 'btn_search'))
    await deliver('phone')
    assert requests[-1].url.params['q'] == 'phone'
    await deliver(tr('fa', 'btn_language'))
    await deliver('🇬🇧 English')
    assert any(button.text == tr('en', 'btn_products') for row in last_text().reply_markup.keyboard for button in row)
    previous = len(sent)
    await deliver('🇬🇧 English', repeat=True)
    assert len(sent) == previous
    await deliver(callback='menu:start', uid=456)
    category = next(button.text for row in last_text().reply_markup.keyboard for button in row if 'گوشی' in button.text)
    await deliver(category, uid=456)
    assert sent[-1].photo == 'persistent-photo-id'
