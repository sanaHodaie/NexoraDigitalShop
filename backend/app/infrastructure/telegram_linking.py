"""Single-use, expiring account links. Raw tokens are never stored."""
import hashlib
import secrets
from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.errors import BusinessError
from app.infrastructure.models import TelegramLink, TelegramLinkChallenge, User, utcnow


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


class TelegramLinking:
    def __init__(self, engine):
        self.engine = engine

    def status(self, user_id):
        with Session(self.engine) as db:
            link = db.get(TelegramLink, user_id)
            return {"linked": link is not None}

    def create(self, user_id):
        token = secrets.token_urlsafe(32)
        expires = utcnow() + timedelta(minutes=10)
        with Session(self.engine) as db, db.begin():
            # Serialize issue/unlink/confirm for this website account.
            db.scalar(select(User).where(User.id == user_id).with_for_update())
            if db.get(TelegramLink, user_id):
                raise BusinessError(409, "حساب تلگرام قبلاً متصل شده است.")
            db.execute(delete(TelegramLinkChallenge).where(TelegramLinkChallenge.user_id == user_id))
            db.add(TelegramLinkChallenge(token_hash=digest(token), user_id=user_id, expires_at=expires))
        return token, expires

    def confirm(self, token, telegram_user_id):
        try:
            with Session(self.engine) as db, db.begin():
                hashed = digest(token)
                uid = db.scalar(select(TelegramLinkChallenge.user_id).where(
                    TelegramLinkChallenge.token_hash == hashed))
                if uid is None:
                    raise BusinessError(400, "لینک اتصال نامعتبر یا منقضی شده است.")
                db.scalar(select(User).where(User.id == uid).with_for_update())
                # Atomic consume protects replay, including concurrent confirmations.
                consumed = db.execute(delete(TelegramLinkChallenge).where(
                    TelegramLinkChallenge.token_hash == hashed,
                    TelegramLinkChallenge.expires_at > utcnow(),
                )).rowcount
                if consumed != 1:
                    raise BusinessError(400, "لینک اتصال نامعتبر یا منقضی شده است.")
                if db.get(TelegramLink, uid):
                    raise BusinessError(409, "این حساب قبلاً متصل شده است.")
                db.add(TelegramLink(user_id=uid, telegram_user_id=telegram_user_id))
        except IntegrityError as exc:
            raise BusinessError(409, "این حساب تلگرام قبلاً به حساب دیگری متصل شده است.") from exc
        return {"linked": True}

    def unlink(self, user_id):
        with Session(self.engine) as db, db.begin():
            db.scalar(select(User).where(User.id == user_id).with_for_update())
            db.execute(delete(TelegramLink).where(TelegramLink.user_id == user_id))
            db.execute(delete(TelegramLinkChallenge).where(TelegramLinkChallenge.user_id == user_id))
