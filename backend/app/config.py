from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", hide_input_in_errors=True
    )

    environment: Literal["development", "production", "test"] = "development"
    database_url: SecretStr = SecretStr("postgresql+psycopg://nexora:nexora@localhost:5432/nexora")
    secret_key: SecretStr = SecretStr("local-development-only-change-before-deploying")
    google_client_id: str | None = None
    auth_rate_limit: int = 10
    newsletter_rate_limit: int = 5
    session_days: int = 14

    @model_validator(mode="after")
    def production_configuration(self):
        url = self.database_url.get_secret_value()
        # Accept the standard PostgreSQL URL provided by Neon; use psycopg 3.
        if url.startswith(("postgres://", "postgresql://")):
            self.database_url = SecretStr("postgresql+psycopg://" + url.split("://", 1)[1])
            url = self.database_url.get_secret_value()
        if self.environment != "test" and not url.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL must point to PostgreSQL (SQLite is supported only in tests).")
        if self.environment == "production":
            secret = self.secret_key.get_secret_value()
            if len(secret) < 32 or secret == "local-development-only-change-before-deploying":
                raise ValueError("Set a random SECRET_KEY of at least 32 characters in production.")
        return self

    @property
    def secure_cookies(self) -> bool:
        return self.environment != "development"

    @property
    def session_cookie(self) -> str:
        return "__Host-Nexora" if self.secure_cookies else "Nexora"

    @property
    def csrf_cookie(self) -> str:
        return "__Host-Nexora-CSRF" if self.secure_cookies else "Nexora-CSRF"
