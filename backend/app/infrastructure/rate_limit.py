import hashlib
import hmac
import threading
import time
from ipaddress import ip_address, ip_network

from app.domain.errors import BusinessError


class LocalLimiter:
    """Development/test adapter only; production refuses to use it."""

    def __init__(self):
        self.counts, self.lock = {}, threading.Lock()

    def allow(self, key, limit, seconds=60):
        now = time.monotonic()
        with self.lock:
            self.counts = {k: v for k, v in self.counts.items() if v[0] > now}
            until, count = self.counts.get(key, (now + seconds, 0))
            self.counts[key] = until, count + 1
            return count < limit


class RedisLimiter:
    SCRIPT = """local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[2]) end; return n<=tonumber(ARGV[1]) and 1 or 0"""

    def __init__(self, url):
        import redis

        self.client = redis.Redis.from_url(url, socket_connect_timeout=3, socket_timeout=3)

    def allow(self, key, limit, seconds=60):
        try:
            return bool(self.client.eval(self.SCRIPT, 1, "nexora:rate:" + key, limit, seconds))
        except Exception:
            raise BusinessError(503, "سرویس موقتاً در دسترس نیست.", "RATE_LIMIT_UNAVAILABLE") from None


def bucket(settings, kind, value):
    return (
        kind
        + ":"
        + hmac.new(
            settings.secret_key.get_secret_value().encode(), value.encode(), hashlib.sha256
        ).hexdigest()
    )


def enforce(request, kind, account=None):
    settings, limiter = request.app.state.settings, request.app.state.limiter
    # Never trust arbitrary X-Forwarded-For headers. Use only the configured ingress header.
    ip = request.client.host if request.client else "unknown"
    if settings.trusted_proxy_header:
        networks = [ip_network(peer, strict=False) for peer in settings.trusted_proxy_peers]
        try:
            current = ip_address(ip)
            chain = request.headers.get(settings.trusted_proxy_header, "").split(",")
            if len(chain) <= 10:
                # Walk from the actual TCP peer towards the client, stopping at the
                # first untrusted hop. Never accept an attacker-supplied leftmost IP.
                for hop in reversed(chain):
                    if not any(current in network for network in networks):
                        break
                    current = ip_address(hop.strip())
                ip = str(current)
        except ValueError:
            pass  # Invalid headers are ignored, never used as unique rate-limit keys.
    limit = settings.login_ip_limit if kind == "login" else settings.auth_rate_limit
    if kind == "newsletter":
        limit = settings.newsletter_rate_limit
    allowed = limiter.allow(bucket(settings, kind + ":ip", ip), limit)
    if account:
        allowed = (
            limiter.allow(
                bucket(settings, kind + ":account", account.strip().lower()),
                settings.login_account_limit if kind == "login" else settings.email_account_limit,
            )
            and allowed
        )
    if not allowed:
        raise BusinessError(429, "درخواست‌های زیادی ارسال شده است. کمی بعد تلاش کنید.", "RATE_LIMITED")
