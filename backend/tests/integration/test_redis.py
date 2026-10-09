import os
import secrets
from concurrent.futures import ThreadPoolExecutor

import pytest

from app.infrastructure.rate_limit import RedisLimiter


def test_real_redis_shared_atomic_limit_and_expiry():
    url = os.environ.get("TEST_REDIS_URL")
    if not url:
        pytest.skip("Set TEST_REDIS_URL to run against a real Redis service")
    first, second = RedisLimiter(url), RedisLimiter(url)
    key = "test:" + secrets.token_hex(16)
    try:
        with ThreadPoolExecutor(max_workers=8) as pool:
            allowed = list(pool.map(lambda i: (first if i % 2 else second).allow(key, 5, 60), range(20)))
        assert sum(allowed) == 5
        assert 0 < first.client.ttl("nexora:rate:" + key) <= 60
    finally:
        first.client.delete("nexora:rate:" + key)
        first.client.close()
        second.client.close()
