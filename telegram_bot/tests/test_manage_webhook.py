from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import manage_webhook
import pytest
from manage_webhook import check_endpoint, validate_url

SECRET = 'safe-test-webhook-secret-' * 2


@pytest.mark.parametrize('url', ['http://bot.test/api/telegram', 'https://bot.test/other',
                                 'https://user:password@bot.test/api/telegram',
                                 'https://bot.test/api/telegram?token=secret'])
def test_webhook_url_requires_public_https_route(url):
    with pytest.raises(RuntimeError):
        validate_url(url)


async def test_endpoint_preflight_checks_secret_without_sending_updates(monkeypatch):
    requests = []
    def respond(request):
        requests.append(request)
        if request.method == 'GET':
            return httpx.Response(200, json={'mode': 'webhook'})
        if request.headers.get('X-Telegram-Bot-Api-Secret-Token') == SECRET:
            return httpx.Response(400, json={'error': 'Invalid update'})
        return httpx.Response(401, json={'error': 'Unauthorized'})
    client_type = httpx.AsyncClient
    monkeypatch.setattr(manage_webhook.httpx, 'AsyncClient',
                        lambda **kwargs: client_type(transport=httpx.MockTransport(respond), **kwargs))
    await check_endpoint('https://bot.test/api/telegram', SECRET)
    assert [r.method for r in requests] == ['GET', 'POST', 'POST']
    assert all(r.content == b'{}' for r in requests[1:])


async def test_set_preserves_pending_updates_and_uses_secret(monkeypatch):
    bot = SimpleNamespace(set_webhook=AsyncMock(), get_webhook_info=AsyncMock(return_value=SimpleNamespace(
        url='https://bot.test/api/telegram', pending_update_count=0, last_error_message=None)))
    class BotContext:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return bot
        async def __aexit__(self, *args):
            pass
    monkeypatch.setenv('BOT_TOKEN', '123456:fake-test-token')
    monkeypatch.setenv('WEBHOOK_SECRET', SECRET)
    monkeypatch.setattr(manage_webhook, 'Bot', BotContext)
    monkeypatch.setattr(manage_webhook, 'telegram_session', lambda _: None)
    monkeypatch.setattr(manage_webhook, 'check_endpoint', AsyncMock())
    await manage_webhook.run(SimpleNamespace(command='set', url='https://bot.test/api/telegram'))
    assert bot.set_webhook.call_args.kwargs['secret_token'] == SECRET
    assert bot.set_webhook.call_args.kwargs['drop_pending_updates'] is False
    assert bot.set_webhook.call_args.kwargs['max_connections'] == 1
