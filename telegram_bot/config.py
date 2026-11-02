import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))


@dataclass(frozen=True)
class Config:
    bot_token: str
    api_base_url: str
    products_path: str
    product_detail_path: str
    proxy_url: str
    data_dir: str
    price_suffix: str
    page_size: int
    telegram_bot_api_key: str
    frontend_url: str = "http://localhost:3000"


def load_config() -> Config:
    token = (os.getenv("BOT_TOKEN") or "").strip()
    if not token:
        raise RuntimeError(
            "BOT_TOKEN در فایل .env تنظیم نشده است."
        )

    base_url = (
        os.getenv("NEXORA_API_URL") or "http://localhost:8000"
    ).strip().rstrip("/")

    proxy = (os.getenv("PROXY_URL") or "").strip()

    api_key = (os.getenv("TELEGRAM_BOT_API_KEY") or "").strip()
    try:
        page_size = int(os.getenv("PAGE_SIZE") or "5")
    except ValueError:
        page_size = 5

    return Config(
        bot_token=token,
        frontend_url=(os.getenv("FRONTEND_URL") or "http://localhost:3000").rstrip("/"),
        api_base_url=base_url,
        products_path=(os.getenv("PRODUCTS_PATH") or "/api/products").strip(),
        product_detail_path=(os.getenv("PRODUCT_DETAIL_PATH") or "/api/products/{id}").strip(),
        proxy_url=proxy,
        data_dir=(os.getenv("DATA_DIR") or "./data").strip(),
        price_suffix=" " + os.getenv("PRICE_SUFFIX", "ریال").strip(),
        page_size=max(1, min(page_size, 10)),
        telegram_bot_api_key=api_key,
    )
