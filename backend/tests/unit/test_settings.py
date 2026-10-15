import pytest
from pydantic import ValidationError

from app.core.config import Settings


def settings(**overrides):
    values = {
        "_env_file": None,
        "environment": "production",
        "database_url": "postgresql://app:example@db.test/shop",
        "migration_database_url": None,
        "secret_key": "test-only-secret-" * 4,
        "frontend_url": "https://shop.test",
        "allowed_origins": [],
        "trusted_proxy_peers": [],
    }
    return Settings(**(values | overrides))


@pytest.mark.parametrize("url", [
    "redis://localhost:6379/0",
    "rediss://default:encoded%40password@redis.test:6379/0",
    "redis://[::1]:6379",
    "unix:///tmp/redis.sock?db=0",
])
def test_redis_connection_urls(url):
    assert settings(redis_url=url).redis_url.get_secret_value() == url


@pytest.mark.parametrize("url", [
    "https://default:private-test-password@redis.test",
    "private-test-password",
    "redis-cli --tls -u rediss://default:private-test-password@redis.test:6379",
    "rediss://default:private-test-password@",
    "rediss://default:private-test-password@redis.test:invalid",
    "rediss://default:private-test-password@redis.test:99999",
    "rediss://default:private-test-password@redis.test:0",
    "rediss://default:private-test-password@[invalid",
    " rediss://default:private-test-password@redis.test",
    "rediss://default:private-test-password@redis.test#fragment",
])
def test_invalid_redis_configuration_is_actionable_without_exposing_password(url):
    with pytest.raises(ValidationError) as error:
        settings(redis_url=url)
    assert "Copy the TCP connection URL" in str(error.value)
    assert "private-test-password" not in str(error.value)


@pytest.mark.parametrize("url", [None, ""])
def test_production_requires_redis(url):
    with pytest.raises(ValidationError, match="Production requires REDIS_URL"):
        settings(redis_url=url)


def test_local_development_accepts_empty_redis():
    assert settings(environment="development", redis_url="").redis_url is None
