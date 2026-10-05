"""Password recovery email delivery; never log raw tokens or email addresses."""

import json
import logging
import secrets
from datetime import timedelta
from urllib.request import Request, urlopen

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import PasswordReset, User, utcnow
from app.security import token_hash

logger = logging.getLogger(__name__)


def send_reset_email(settings, email, token):
    link = settings.frontend_url.rstrip("/") + "/reset-password#token=" + token
    payload = {
        "from": settings.mail_from,
        "to": [email],
        "subject": "بازیابی رمز عبور نکسورا",
        "text": f"برای انتخاب رمز جدید، لینک زیر را باز کنید. این لینک ۳۰ دقیقه اعتبار دارد و فقط یک بار قابل استفاده است.\n\n{link}\n\nاگر این درخواست را ثبت نکرده‌اید، این ایمیل را نادیده بگیرید.",
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": "Bearer " + settings.resend_api_key.get_secret_value(),
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise RuntimeError("Email delivery failed")


def deliver_recovery(engine, settings, email):
    # Run for every valid address after returning the same public response.
    digest = None
    try:
        with Session(engine) as db:
            user = db.scalar(select(User).where(User.email == email).with_for_update())
            if user is None or not user.password_hash:
                return
            now = utcnow()
            recent = db.scalar(
                select(PasswordReset.token_hash).where(
                    PasswordReset.user_id == user.id, PasswordReset.created_at > now - timedelta(minutes=1)
                )
            )
            if recent:
                return
            token = secrets.token_urlsafe(32)
            digest = token_hash(token)
            db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))
            db.add(PasswordReset(token_hash=digest, user_id=user.id, expires_at=now + timedelta(minutes=30)))
            db.commit()
        send_reset_email(settings, email, token)
    except Exception:
        logger.error("Password recovery delivery failed; check email service configuration.")
        if digest:
            with Session(engine) as db:
                db.execute(delete(PasswordReset).where(PasswordReset.token_hash == digest))
                db.commit()
