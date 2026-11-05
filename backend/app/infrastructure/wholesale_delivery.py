"""Leased delivery queue. Approval and queue insertion commit together."""

import secrets
from datetime import timedelta

import httpx
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.infrastructure.models import CustomerDelivery, CustomerRequest, utcnow


class TelegramDocumentSender:
    def __init__(self, settings):
        self.settings = settings

    @property
    def configured(self):
        return bool(
            self.settings.telegram_bot_token and self.settings.telegram_bot_token.get_secret_value().strip()
        )

    def send(self, uid, code, pdf):
        token = self.settings.telegram_bot_token.get_secret_value()
        caption = (
            "✅ سفارش عمده شما تأیید شد.\nکد رهگیری: "
            + code
            + "\nفاکتور پیوست همان نسخهٔ تأییدشدهٔ فروشگاه است. تأیید سفارش به معنی پرداخت نیست."
        )
        # Never log a request URL/exception: the BotFather token is part of the URL.
        with httpx.Client(timeout=30) as client:
            response = client.post(
                "https://api.telegram.org/bot" + token + "/sendDocument",
                data={"chat_id": str(uid), "caption": caption},
                files={"document": ("Nexora-" + code + ".pdf", pdf, "application/pdf")},
            )
        if response.status_code != 200:
            raise RuntimeError("Telegram document delivery failed")
        result = response.json()
        if result.get("ok") is not True:
            raise RuntimeError("Telegram did not confirm delivery")
        return result["result"]["message_id"]


class WholesaleDelivery:
    def __init__(self, engine, sender):
        self.engine, self.sender = engine, sender

    def once(self):
        if not self.sender.configured:
            return False
        now = utcnow()
        lease = secrets.token_hex(16)
        with Session(self.engine) as db, db.begin():
            row = db.scalar(
                select(CustomerDelivery)
                .where(
                    CustomerDelivery.sent_at.is_(None),
                    CustomerDelivery.failed_at.is_(None),
                    CustomerDelivery.available_at <= now,
                    or_(CustomerDelivery.locked_until.is_(None), CustomerDelivery.locked_until <= now),
                )
                .order_by(CustomerDelivery.request_id)
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            if row is None:
                return False
            row.lease = lease
            row.locked_until = now + timedelta(minutes=2)
            row.attempts += 1
            rid, attempts = row.request_id, row.attempts
            request = db.get(CustomerRequest, rid)
            uid, code, pdf = request.telegram_user_id, request.tracking_code, bytes(request.invoice_pdf)
        try:
            message_id = self.sender.send(uid, code, pdf)
            values = {"sent_at": utcnow(), "message_id": message_id, "locked_until": None, "lease": None}
        except Exception:
            values = {
                "locked_until": None,
                "lease": None,
                "available_at": utcnow() + timedelta(seconds=min(3600, 10 * 2**attempts)),
            }
            if attempts >= 6:
                values["failed_at"] = utcnow()
        with Session(self.engine) as db, db.begin():
            db.execute(
                update(CustomerDelivery)
                .where(CustomerDelivery.request_id == rid, CustomerDelivery.lease == lease)
                .values(**values)
            )
        return True
