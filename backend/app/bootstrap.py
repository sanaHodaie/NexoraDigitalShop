"""Composition root: the only place that wires ports to concrete adapters."""

from app.application.identity import Identity, IdentityPolicy
from app.application.orders import Orders
from app.application.shopping import Shopping
from app.infrastructure.crypto import Cipher, PasswordAdapter, TokenAdapter
from app.infrastructure.google import GoogleAdapter
from app.infrastructure.repositories import SqlUnitOfWork


class Services:
    def __init__(self, settings, engine):
        self.cipher = Cipher(settings.secret_key.get_secret_value())
        self.uow = lambda: SqlUnitOfWork(engine, self.cipher)
        policy = IdentityPolicy(
            settings.session_days,
            settings.session_idle_seconds,
            bool(
                settings.resend_api_key and settings.resend_api_key.get_secret_value() and settings.mail_from
            ),
            settings.notify_password_change,
        )
        self.identity = Identity(
            self.uow, PasswordAdapter(), TokenAdapter(), policy, GoogleAdapter(settings.google_client_id)
        )
        self.shopping = Shopping(self.uow)
        self.orders = Orders(self.uow, settings.reservation_minutes, settings.require_verified_email)
