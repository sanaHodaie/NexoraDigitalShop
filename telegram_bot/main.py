"""نقطه‌ی ورود ربات تلگرام فروشگاه NexoraDigitalShop."""
import asyncio
import logging

from aiogram import Bot, Dispatcher

from api_client import NexoraClient
from config import load_config
from handlers import NexoraHandlers
from settings_store import SettingsStore
from transport import telegram_session


class SecretFormatter(logging.Formatter):
    def __init__(self, *values):
        super().__init__("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
        self.values = [v for v in values if v]

    def format(self, record):
        result = super().format(record)
        for value in self.values:
            result = result.replace(value, "[REDACTED]")
        return result


async def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    logging.getLogger("aiogram.event").setLevel(logging.WARNING)

    cfg = load_config()
    for handler in logging.getLogger().handlers:
        handler.setFormatter(SecretFormatter(cfg.bot_token, cfg.telegram_bot_api_key, cfg.proxy_url))

    logging.getLogger("httpx").setLevel(logging.WARNING)
    session = telegram_session(cfg.proxy_url)

    bot = Bot(token=cfg.bot_token, session=session)
    dp = Dispatcher()

    client = NexoraClient(
        base_url=cfg.api_base_url,
        products_path=cfg.products_path,
        product_detail_path=cfg.product_detail_path,
        telegram_bot_api_key=cfg.telegram_bot_api_key,
    )
    store = SettingsStore(cfg.data_dir)
    dp.include_router(NexoraHandlers(cfg, client, store).router)

    try:
        # Do not remove an existing deployment webhook or discard queued updates.
        info = await bot.get_webhook_info()
        if info.url:
            raise RuntimeError("Webhook is configured. Stop the webhook deployment before polling.")
        await bot.get_me()
        await dp.start_polling(bot)
    finally:
        await client.aclose()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("ربات متوقف شد.")
    except Exception as exc:
        logging.error("Bot stopped (%s). Check configuration/connectivity.", type(exc).__name__)
        raise SystemExit(1) from None