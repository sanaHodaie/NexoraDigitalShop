from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # "anthropic" (paid API) or "openai": any OpenAI-compatible endpoint (Ollama, Gemini, Groq, OpenRouter...)
    llm_provider: Literal["anthropic", "openai"] = "anthropic"
    llm_base_url: str | None = None
    llm_api_key: SecretStr | None = None
    llm_model: str | None = None
    anthropic_api_key: SecretStr | None = None
    agent_model: str = "claude-sonnet-5-5"
    max_tokens: int = Field(default=1024, ge=128, le=4096)

    catalog_source: Literal["file", "api"] = "file"
    catalog_file: str = "data/catalog-products.json"
    nexora_api_base: str = "http://127.0.0.1:8000"
    catalog_cache_seconds: int = Field(default=30, ge=0, le=600)

    # Mirrors the storefront: ShopContext.RIAL_RATE and backend order_total().
    rial_rate: int = 600_000
    free_shipping_threshold: float = 99
    shipping_fee: float = 9.99
    reservation_minutes: int = 20

    max_tool_rounds: int = Field(default=6, ge=1, le=10)
    max_history_messages: int = Field(default=20, ge=1, le=50)
    max_message_chars: int = Field(default=1000, ge=50, le=4000)
    rate_limit_per_minute: int = Field(default=15, ge=1)
    daily_request_cap: int = Field(default=1000, ge=0)  # 0 = unlimited; protects a paid API key
    allowed_origins: list[str] = Field(default_factory=list)
