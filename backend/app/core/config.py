from ipaddress import ip_network
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", hide_input_in_errors=True
    )

    environment: Literal["development", "production", "test"] = "development"
    database_url: SecretStr = SecretStr("postgresql+psycopg://nexora:nexora@localhost:5432/nexora")
    secret_key: SecretStr = SecretStr("local-development-only-change-before-deploying")
    run_worker: bool = True
    migrate_on_start: bool = True
    google_client_id: str | None = None
    resend_api_key: SecretStr | None = None
    mail_from: str = ""
    frontend_url: str = "http://localhost:3000"
    auth_rate_limit: int = 10
    newsletter_rate_limit: int = 5
    session_days: int = Field(default=14, ge=1, le=30)
    session_idle_seconds: int = Field(default=1800, ge=60, le=86400)
    reservation_minutes: int = Field(default=20, ge=1, le=120)
    require_verified_email: bool = True
    redis_url: SecretStr | None = None
    migration_database_url: SecretStr | None = None
    allowed_origins: list[str] = Field(default_factory=list)
    trusted_proxy_header: str | None = None
    trusted_proxy_peers: list[str] = Field(default_factory=list)
    login_ip_limit: int = 30
    login_account_limit: int = 5
    email_account_limit: int = 3
    notify_password_change: bool = True

    @model_validator(mode="after")
    def production_configuration(self):
        for peer in self.trusted_proxy_peers:
            ip_network(peer, strict=False)
        origin = urlsplit(self.frontend_url)
        if (
            origin.scheme not in {"https", "http"}
            or not origin.hostname
            or origin.username
            or origin.password
            or origin.query
            or origin.fragment
            or origin.path not in {"", "/"}
            or (origin.scheme == "http" and origin.hostname not in {"localhost", "127.0.0.1"})
        ):
            raise ValueError("FRONTEND_URL must be an HTTPS origin (local HTTP is allowed).")
        if self.environment == "production" and origin.scheme != "https":
            raise ValueError("Set an HTTPS FRONTEND_URL for production password recovery.")
        if self.migration_database_url:
            migration_url = self.migration_database_url.get_secret_value()
            if migration_url.startswith(("postgres://", "postgresql://")):
                self.migration_database_url = SecretStr(
                    "postgresql+psycopg://" + migration_url.split("://", 1)[1]
                )
        url = self.database_url.get_secret_value()
        # Accept the standard PostgreSQL URL provided by Neon; use psycopg 3.
        if url.startswith(("postgres://", "postgresql://")):
            self.database_url = SecretStr("postgresql+psycopg://" + url.split("://", 1)[1])
            url = self.database_url.get_secret_value()
        if self.environment != "test" and not url.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL must point to PostgreSQL (SQLite is supported only in tests).")
        if self.environment == "production":
            if not self.redis_url:
                raise ValueError("Production requires REDIS_URL; no in-memory fallback is allowed.")
            secret = self.secret_key.get_secret_value()
            if len(secret) < 32 or secret == "local-development-only-change-before-deploying":
                raise ValueError("Set a random SECRET_KEY of at least 32 characters in production.")
        for allowed in self.allowed_origins:
            parts = urlsplit(allowed)
            if (
                not parts.hostname
                or parts.scheme not in {"http", "https"}
                or parts.path
                or parts.query
                or parts.fragment
                or parts.username
                or "*" in allowed
            ):
                raise ValueError("ALLOWED_ORIGINS must contain exact origins only.")
            if self.environment == "production" and parts.scheme != "https":
                raise ValueError("Production origins require HTTPS.")
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
