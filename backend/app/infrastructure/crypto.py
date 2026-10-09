import base64
import hashlib
import hmac
import json
import secrets

from cryptography.fernet import Fernet
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

password_hasher = PasswordHash.recommended()
_dummy_hash = password_hasher.hash(secrets.token_urlsafe(32))


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def verify_password(password, encoded):
    try:
        return bool(password_hasher.verify(password, encoded or _dummy_hash)) and bool(encoded)
    except (ValueError, UnknownHashError):
        return False


class PasswordAdapter:
    hash = staticmethod(password_hasher.hash)
    verify = staticmethod(verify_password)


class TokenAdapter:
    new = staticmethod(lambda: secrets.token_urlsafe(32))
    digest = staticmethod(token_hash)


class Cipher:
    def __init__(self, secret):
        self.fernet = Fernet(
            base64.urlsafe_b64encode(hashlib.sha256(("email-outbox:" + secret).encode()).digest())
        )

    def encrypt(self, payload):
        return self.fernet.encrypt(json.dumps(payload).encode()).decode()

    def decrypt(self, payload):
        return json.loads(self.fernet.decrypt(payload.encode()))


def csrf_token(settings, nonce, session):
    message = f"{nonce}:{token_hash(session)}".encode()
    return hmac.new(settings.secret_key.get_secret_value().encode(), message, hashlib.sha256).hexdigest()


def valid_csrf(request):
    settings = request.app.state.settings
    nonce, supplied = request.cookies.get(settings.csrf_cookie, ""), request.headers.get("X-CSRF-TOKEN", "")
    return (
        bool(nonce)
        and len(nonce) <= 128
        and len(supplied) == 64
        and supplied.isascii()
        and hmac.compare_digest(
            supplied, csrf_token(settings, nonce, request.cookies.get(settings.session_cookie, ""))
        )
    )
