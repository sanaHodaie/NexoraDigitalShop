from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
from api_client import NexoraClient
from config import load_config
from handlers import NexoraHandlers
from settings_store import SettingsStore


async def test_catalogue_cache_reuses_lists_but_details_and_search_are_fresh():
    calls = []
    def respond(request):
        calls.append(str(request.url))
        product = {'id': 'p', 'name': 'Phone', 'price': 5, 'category': 'smartphones'}
        return httpx.Response(200, json=product if request.url.path.endswith('/p') else [product])
    client = NexoraClient('https://shop.test', product_detail_path='/api/products/{id}')
    await client.aclose()
    client._client = httpx.AsyncClient(transport=httpx.MockTransport(respond), base_url='https://shop.test')
    try:
        first = await client.get_products()
        first[0].name = 'mutated'
        assert (await client.get_products())[0].name == 'Phone'
        assert len(calls) == 1
        await client.get_product('p')
        await client.get_product('p')
        await client.get_products(query='phone')
        await client.get_products(query='phone')
        assert len(calls) == 5
        client._catalogue_cache[None] = (0, [])
        await client.get_products()
        assert len(calls) == 6
    finally:
        await client.aclose()


async def test_failed_catalogue_request_is_not_cached():
    calls = 0
    def respond(request):
        nonlocal calls
        calls += 1
        return httpx.Response(503 if calls == 1 else 200, json=[])
    client = NexoraClient('https://shop.test')
    await client.aclose()
    client._client = httpx.AsyncClient(transport=httpx.MockTransport(respond), base_url='https://shop.test')
    try:
        from api_client import ApiHttpError
        with pytest.raises(ApiHttpError):
            await client.get_products()
        assert await client.get_products() == [] and calls == 2
    finally:
        await client.aclose()


async def test_category_photo_reuses_telegram_file_id(tmp_path, monkeypatch):
    monkeypatch.setenv('BOT_TOKEN', '123456:fake-test-token')
    handler = NexoraHandlers(load_config(), AsyncMock(), SettingsStore(str(tmp_path)))
    photo = SimpleNamespace(file_id='telegram-file-id')
    message = SimpleNamespace(answer_photo=AsyncMock(return_value=SimpleNamespace(photo=[photo])))
    await handler.show_category_photo(message, 'smartphones')
    await handler.show_category_photo(message, 'smartphones')
    assert message.answer_photo.call_args.args[0] == 'telegram-file-id'
