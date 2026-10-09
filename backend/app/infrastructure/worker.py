"""Durable transactional outbox with leases, bounded retries and dead-letter state."""

import logging
import secrets
import time
from datetime import timedelta

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.domain.entities import utcnow
from app.infrastructure.models import Outbox

logger = logging.getLogger(__name__)


class Worker:
    def __init__(self, engine, cipher, identity, orders, sender):
        self.engine, self.cipher, self.identity, self.orders, self.sender = (
            engine,
            cipher,
            identity,
            orders,
            sender,
        )

    def once(self):
        self.orders.expire_due()
        now, lease = utcnow(), secrets.token_hex(16)
        with Session(self.engine) as db:
            row = db.scalar(
                select(Outbox)
                .where(
                    Outbox.completed_at.is_(None),
                    Outbox.failed_at.is_(None),
                    Outbox.available_at <= now,
                    or_(Outbox.locked_until.is_(None), Outbox.locked_until <= now),
                )
                .order_by(Outbox.id)
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            if row is None:
                return False
            row.lease, row.locked_until = lease, now + timedelta(minutes=2)
            row.attempts += 1
            job_id, kind, encrypted, attempts = row.id, row.kind, row.payload, row.attempts
            db.commit()
        try:
            payload = self.cipher.decrypt(encrypted)
            if kind in {"recovery_request", "verification_request"}:
                self.identity.issue_email_token(
                    payload["email"], "reset" if kind == "recovery_request" else "verify", f"link:{job_id}"
                )
            else:
                self.sender.send(kind, payload, job_id)
            values = {"completed_at": utcnow(), "locked_until": None, "payload": "", "lease": None}
        except Exception:
            logger.error("Email job failed; retry scheduled or moved to dead-letter state")
            values = {
                "locked_until": None,
                "lease": None,
                "available_at": utcnow() + timedelta(seconds=min(3600, 10 * 2**attempts)),
            }
            if attempts >= 6:
                values["failed_at"] = utcnow()
        with Session(self.engine) as db:
            db.execute(update(Outbox).where(Outbox.id == job_id, Outbox.lease == lease).values(**values))
            db.commit()
        return True


def main():
    from app.bootstrap import Services
    from app.core.config import Settings
    from app.core.logging import configure_logging
    from app.infrastructure.database import make_engine
    from app.infrastructure.database_security import check_runtime_role
    from app.infrastructure.mail import EmailSender

    configure_logging()
    settings = Settings()
    engine = make_engine(settings.database_url.get_secret_value())
    if settings.environment == "production":
        check_runtime_role(engine)
    services = Services(settings, engine)
    worker = Worker(engine, services.cipher, services.identity, services.orders, EmailSender(settings))
    try:
        while True:
            try:
                if not worker.once():
                    time.sleep(2)
            except Exception:
                logger.error("Worker cycle failed; retrying without exposing exception details")
                time.sleep(5)
    except KeyboardInterrupt:
        pass
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
