from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import httpx
from webhook_app import create_app

SECRET = 'webhook-test-secret-' * 3
HEADERS = {'X-Telegram-Bot-Api-Secret-Token': SECRET}
VALID = {'update_id': 1, 'message': {'message_id': 1, 'date': 1700000000,
         'chat': {'id': 123, 'type': 'private'},
         'from': {'id': 123, 'is_bot': False, 'first_name': 'Test'}, 'text': '/start'}}


async def test_webhook_fails_closed_and_does_not_initialize_runtime(monkeypatch):
    monkeypatch.setenv('WEBHOOK_SECRET', SECRET)
    factory = Mock()
    app = create_app(factory)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app), base_url='https://bot.test') as client:
        assert (await client.post('/api/telegram', json=VALID)).status_code == 401
        assert (await client.post('/api/telegram', headers=HEADERS, json={})).status_code == 400
        assert (await client.post('/api/telegram', headers=HEADERS, content=b'x' * (1024*1024+1))).status_code == 413
        assert (await client.get('/health')).json()['mode'] == 'webhook'
        monkeypatch.delenv('WEBHOOK_SECRET')
        assert (await client.post('/api/telegram', headers=HEADERS, json=VALID)).status_code == 503
    factory.assert_not_called()


async def test_webhook_awaits_processing_and_retries_failures_without_leaking_errors(monkeypatch):
    monkeypatch.setenv('WEBHOOK_SECRET', SECRET)
    runtime = SimpleNamespace(process=AsyncMock(), close=AsyncMock())
    factory = Mock(return_value=runtime)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(create_app(factory)), base_url='https://bot.test') as client:
        result = await client.post('/api/telegram', headers=HEADERS, json=VALID)
        assert result.status_code == 200
        runtime.process.assert_awaited_once()
        runtime.process.side_effect = RuntimeError('do-not-expose-secret')
        result = await client.post('/api/telegram', headers=HEADERS, json=VALID)
        assert result.status_code == 503 and result.headers['retry-after'] == '5'
        assert 'do-not-expose-secret' not in result.text
    factory.assert_called_once()


async def test_expired_callback_ack_does_not_block_webhook_but_other_errors_propagate():
    import pytest
    from aiogram.exceptions import TelegramBadRequest
    from aiogram.methods import AnswerCallbackQuery, SendMessage
    from webhook_app import ExpiredCallbackAck
    ack = AnswerCallbackQuery(callback_query_id='old')
    failed = AsyncMock(side_effect=TelegramBadRequest(ack, 'query is too old and response timeout expired'))
    assert await ExpiredCallbackAck()(failed, None, ack) is True
    send = SendMessage(chat_id=123, text='Test')
    failed = AsyncMock(side_effect=TelegramBadRequest(send, 'chat not found'))
    with pytest.raises(TelegramBadRequest):
        await ExpiredCallbackAck()(failed, None, send)
