"""Exercise the ZIP's real client against FastAPI, without Telegram credentials."""
import asyncio
import importlib.util
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from conftest import register, write
from pydantic import SecretStr


def test_bot_client_catalogue_and_single_use_link(client, app):
    path = Path(__file__).resolve().parents[3] / "telegram_bot" / "api_client.py"
    spec = importlib.util.spec_from_file_location("nexora_telegram_contract_client", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    key = "contract-test-key-" * 3
    app.state.settings.telegram_bot_api_key = SecretStr(key)
    app.state.settings.telegram_bot_username = "NexoraTestBot"
    register(client)
    result = write(client, "POST", "/api/account/telegram/link")
    token = parse_qs(urlsplit(result.json()["url"]).query)["start"][0]

    async def scenario():
        bot = module.NexoraClient("https://shop.test", product_detail_path="/api/products/{id}",
                                  telegram_bot_api_key=key)
        await bot.aclose()
        bot._client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="https://shop.test")
        try:
            assert await bot.health()
            products = await bot.get_products()
            assert len(products) > 1
            product = await bot.get_product(products[0].id)
            assert product.id == products[0].id
            assert product.price == products[0].price
            found = await bot.get_products(query=product.name)
            assert product.id in [p.id for p in found]
            assert await bot.complete_telegram_direct_link(token, 987654321) == {"linked": True}
            with pytest.raises(module.ApiHttpError) as exc:
                await bot.complete_telegram_direct_link(token, 987654321)
            assert exc.value.status_code == 400
        finally:
            await bot.aclose()
    asyncio.run(scenario())
    assert client.get("/api/account/telegram").json()["linked"] is True


def test_bot_enquiry_appears_in_admin_panel_api(client, app, engine):
    from uuid import uuid4

    from test_management import grant

    path = Path(__file__).resolve().parents[3] / 'telegram_bot' / 'api_client.py'
    spec = importlib.util.spec_from_file_location('nexora_customer_client', path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    key = 'customer-enquiry-contract-key-' * 2
    app.state.settings.telegram_bot_api_key = SecretStr(key)
    payload = {'request_key':str(uuid4()),'telegram_user_id':123,'telegram_username':'customer',
               'kind':'wholesale','details':{'name':'مشتری عمده','phone':'09120000000','company':'شرکت تست',
               'items':'گوشی هوشمند','quantity':25,'city':'تهران','address':'خیابان تست، پلاک ۲۵','notes':''}}
    async def create():
        bot = module.NexoraClient('https://shop.test', telegram_bot_api_key=key)
        await bot.aclose()
        bot._client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='https://shop.test')
        try:
            result = await bot.create_customer_request(payload)
            assert (await bot.customer_requests(123))['items'][0]['id'] == result['id']
            assert (await bot.customer_requests(456))['items'] == []
            return result
        finally:
            await bot.aclose()
    result = asyncio.run(create())
    register(client)
    grant(engine)
    row = client.get('/api/admin/customer-requests').json()['items'][0]
    assert row['id'] == result['id'] and row['details']['quantity'] == 25
    assert row['details']['address'] == 'خیابان تست، پلاک ۲۵'
