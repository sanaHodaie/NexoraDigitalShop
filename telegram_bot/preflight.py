"""Read-only checks. No messages, polling or webhook changes."""

import argparse
import asyncio
import os

from api_client import NexoraClient
from config import load_config
from dotenv import load_dotenv


async def check(telegram=False, customer_service=False):
    load_dotenv()
    if not customer_service:
        client = NexoraClient(
            os.getenv("NEXORA_API_URL", "http://localhost:8000"),
            product_detail_path="/api/products/{id}",
        )
        try:
            if not await client.health():
                raise RuntimeError("Backend health check failed")
            products = await client.get_products()
            if not products:
                raise RuntimeError("Catalogue is empty")
            detail = await client.get_product(products[0].id)
            if detail is None or detail.id != products[0].id:
                raise RuntimeError("Product detail contract failed")
            print(f"Backend OK: {len(products)} products; product details OK")
        finally:
            await client.aclose()
    if customer_service:
        cfg = load_config()
        if not cfg.telegram_bot_api_key:
            from api_client import ApiConfigurationError

            raise ApiConfigurationError("Missing shared service key")
        service = NexoraClient(
            cfg.api_base_url, telegram_bot_api_key=cfg.telegram_bot_api_key
        )
        try:
            ready = await service.customer_service_health()
            print("Customer service authentication, schema and read/insert access: OK")
            print(
                "Automatic invoice delivery configured:",
                bool(ready.get("notificationsConfigured")),
            )
        finally:
            await service.aclose()
    if telegram:
        from aiogram import Bot
        from transport import telegram_session

        cfg = load_config()
        async with Bot(cfg.bot_token, session=telegram_session(cfg.proxy_url)) as bot:
            me = await bot.get_me()
            webhook = await bot.get_webhook_info()
            print(f"Telegram getMe OK: @{me.username}")
            if webhook.url:
                raise RuntimeError(
                    "A webhook is active; do not start a competing poller"
                )
            print("No webhook configured; polling can start")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--telegram", action="store_true")
    parser.add_argument("--customer-service", action="store_true")
    args = parser.parse_args()
    try:
        asyncio.run(check(args.telegram, args.customer_service))
    except Exception as exc:
        # Network/library exceptions can contain the BotFather token in URLs.
        from api_client import ApiConfigurationError, ApiHttpError

        if isinstance(exc, ApiConfigurationError):
            print(
                "TELEGRAM_BOT_API_KEY is missing in the bot environment. Do not send its value in chat."
            )
        elif isinstance(exc, ApiHttpError):
            reasons = {
                401: "Backend rejected the shared service key.",
                404: "Backend customer-service routes are not deployed.",
                503: "Backend database schema/grants or service readiness needs attention.",
            }
            print(
                "Customer service check:",
                reasons.get(exc.status_code, "HTTP " + str(exc.status_code)),
            )
        else:
            print(
                f"Preflight failed ({type(exc).__name__}); verify configuration and connectivity."
            )
        raise SystemExit(1) from None
