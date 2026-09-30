import hashlib
import hmac
import secrets
import time
from datetime import timedelta
from threading import Lock

from fastapi import Depends, HTTPException, Request, Response
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import get_db
from app.models import AuthSession, User, utcnow

password_hasher = PasswordHash.recommended()
# Also perform a real hash verification for unknown users.
_dummy_hash = password_hasher.hash(secrets.token_urlsafe(32))


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    settings = request.app.state.settings
    token = request.cookies.get(settings.session_cookie, "")
    user = (
        db.scalar(
            select(User)
            .join(AuthSession)
            .where(AuthSession.token_hash == token_hash(token), AuthSession.expires_at > utcnow())
        )
        if token
        else None
    )
    if user is None:
        raise HTTPException(401, "ابتدا وارد حساب خود شوید.")
    return user


def verify_password(password: str, encoded: str | None) -> bool:
    try:
        result = password_hasher.verify(password, encoded or _dummy_hash)
        return bool(encoded) and result
    except (ValueError, UnknownHashError):
        return False


def sign_in(request: Request, response: Response, db: Session, user: User):
    settings = request.app.state.settings
    previous = request.cookies.get(settings.session_cookie)
    if previous:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == token_hash(previous)))
    db.execute(delete(AuthSession).where(AuthSession.expires_at <= utcnow()))
    token = secrets.token_urlsafe(32)
    db.add(
        AuthSession(
            token_hash=token_hash(token),
            user_id=user.id,
            expires_at=utcnow() + timedelta(days=settings.session_days),
        )
    )
    db.commit()
    response.set_cookie(
        settings.session_cookie,
        token,
        secure=settings.secure_cookies,
        httponly=True,
        samesite="strict",
        path="/",
    )


def csrf_token(settings: Settings, nonce: str, session: str) -> str:
    message = f"{nonce}:{token_hash(session)}".encode()
    return hmac.new(settings.secret_key.get_secret_value().encode(), message, hashlib.sha256).hexdigest()


def valid_csrf(request: Request) -> bool:
    settings = request.app.state.settings
    nonce = request.cookies.get(settings.csrf_cookie, "")
    supplied = request.headers.get("X-CSRF-TOKEN", "")
    if not nonce or len(nonce) > 128 or len(supplied) != 64 or not supplied.isascii():
        return False
    expected = csrf_token(settings, nonce, request.cookies.get(settings.session_cookie, ""))
    return hmac.compare_digest(supplied, expected)


class RateLimiter:
    """Fixed windows shared by each endpoint group, matching the previous API.

    Run a single worker; multi-worker deployments need a shared limiter store.
    """

    def __init__(self):
        self._lock = Lock()
        self._windows: dict[str, tuple[int, int]] = {}

    def allow(self, group: str, limit: int) -> bool:
        window = int(time.monotonic() // 60)
        with self._lock:
            previous, count = self._windows.get(group, (window, 0))
            count = count if previous == window else 0
            if count >= limit:
                return False
            self._windows[group] = (window, count + 1)
            return True
