from dataclasses import dataclass
from datetime import timedelta

from app.application.ports import GoogleIdentity, Passwords, Tokens, UnitOfWork
from app.domain.entities import Session, User, utcnow
from app.domain.errors import BusinessError, Conflict

GENERIC_EMAIL = "اگر حساب واجد شرایطی وجود داشته باشد، ایمیل راهنما ارسال می‌شود. پوشهٔ اسپم را هم بررسی کنید."


@dataclass(frozen=True)
class IdentityPolicy:
    session_days: int = 14
    idle_seconds: int = 1800
    email_enabled: bool = False
    notify_password_change: bool = True


class Identity:
    """Identity module use cases; transactions through ports, no framework/ORM imports."""

    def __init__(
        self,
        uow,
        passwords: Passwords,
        tokens: Tokens,
        policy: IdentityPolicy,
        google: GoogleIdentity,
        clock=utcnow,
    ):
        self.uow, self.passwords, self.tokens = uow, passwords, tokens
        self.policy, self.google, self.clock = policy, google, clock

    def _session(self, tx: UnitOfWork, user, previous=None):
        now = self.clock()
        if previous:
            tx.sessions.revoke(user.id, now, self.tokens.digest(previous))
        token = self.tokens.new()
        tx.sessions.save(
            Session(
                self.tokens.digest(token), user.id, now + timedelta(days=self.policy.session_days), now, now
            )
        )
        return token

    def authenticate(self, token):
        if not token or len(token) > 128:
            raise BusinessError(401, "ابتدا وارد حساب خود شوید.", "UNAUTHENTICATED")
        with self.uow() as tx:
            session = tx.sessions.get(self.tokens.digest(token))
            if session is None:
                raise BusinessError(401, "ابتدا وارد حساب خود شوید.", "UNAUTHENTICATED")
            user = tx.users.get(session.user_id, lock=True)
            session = tx.sessions.get(self.tokens.digest(token), lock=True)
            now = self.clock()
            if user is None or session is None or not session.active(now, self.policy.idle_seconds):
                raise BusinessError(401, "نشست ورود منقضی شده است.", "SESSION_EXPIRED")
            session.last_used_at = now
            tx.sessions.save(session)
            tx.commit()
            return user

    def login(self, email, password, previous=None):
        with self.uow() as tx:
            user = tx.users.by_email(email.strip().lower(), lock=True)
            if not self.passwords.verify(password, user.password_hash if user else None):
                tx.audit("LOGIN_FAILED")  # No identifier disclosure in logs.
                tx.commit()
                raise BusinessError(401, "ایمیل یا رمز عبور نادرست است.", "INVALID_CREDENTIALS")
            token = self._session(tx, user, previous)
            tx.audit("LOGIN_SUCCESS", user.id)
            tx.commit()
            return user, token

    def register(self, email, password, name):
        hashed = self.passwords.hash(password)  # Same expensive path for duplicate addresses.
        try:
            with self.uow() as tx:
                user = tx.users.by_email(email, lock=True)
                if user is None:
                    user = tx.users.save(User(None, email, hashed, name or ""))
                if self.policy.email_enabled and user.email_verified_at is None:
                    tx.enqueue("verification_request", {"email": email})
                tx.commit()
        except Conflict:
            pass  # Concurrent duplicate registration: same public response.
        return {"message": GENERIC_EMAIL}

    def logout(self, uid, token, all_devices=False):
        with self.uow() as tx:
            tx.users.get(uid, lock=True)
            tx.sessions.revoke(uid, self.clock(), None if all_devices else self.tokens.digest(token))
            tx.audit("LOGOUT", uid)
            tx.audit("SESSION_REVOKED", uid)
            tx.commit()

    def change_password(self, uid, current_password, new_password):
        with self.uow() as tx:
            user = tx.users.get(uid, lock=True)
            if not self.passwords.verify(current_password, user.password_hash):
                raise BusinessError(400, "رمز عبور فعلی درست نیست.", "INVALID_CURRENT_PASSWORD")
            if current_password == new_password:
                raise BusinessError(400, "رمز جدید باید متفاوت باشد.")
            user.password_hash = self.passwords.hash(new_password)
            tx.users.save(user)
            tx.tokens.clear(uid, "reset")
            tx.tokens.clear(uid, "email_change")
            tx.sessions.revoke(uid, self.clock())
            token = self._session(tx, user)
            tx.audit("PASSWORD_CHANGED", uid)
            tx.audit("SESSION_REVOKED", uid)
            if self.policy.email_enabled and self.policy.notify_password_change:
                tx.enqueue("password_changed", {"email": user.email})
            tx.commit()
            return token

    def forgot_password(self, email):
        return self._request_email("recovery_request", email)

    def request_verification(self, email):
        return self._request_email("verification_request", email)

    def _request_email(self, kind, email):
        if not self.policy.email_enabled:
            raise BusinessError(503, "ارسال ایمیل هنوز فعال نشده است.", "EMAIL_UNAVAILABLE")
        with self.uow() as tx:
            tx.enqueue(kind, {"email": email})
            tx.commit()
        return {"message": GENERIC_EMAIL}

    def issue_email_token(self, email, purpose, job_key=None):
        """Worker-only use case. Raw tokens exist only in encrypted delivery jobs."""
        with self.uow() as tx:
            user = tx.users.by_email(email, lock=True)
            if job_key and tx.job_exists(job_key):
                return
            if (
                user is None
                or (purpose == "reset" and not user.password_hash)
                or (purpose == "verify" and user.email_verified_at)
            ):
                return
            token = self.tokens.new()
            tx.tokens.issue(user.id, purpose, self.tokens.digest(token), self.clock() + timedelta(minutes=30))
            tx.enqueue(
                "reset_link" if purpose == "reset" else "verify_link",
                {"email": email, "token": token},
                job_key,
            )
            tx.commit()

    def reset_password(self, token, password):
        with self.uow() as tx:
            entry = tx.tokens.find("reset", self.tokens.digest(token))
            user = tx.users.get(entry[0], lock=True) if entry else None
            if user is None or tx.tokens.consume("reset", self.tokens.digest(token), self.clock()) is None:
                raise BusinessError(400, "لینک بازیابی نامعتبر یا منقضی شده است.", "INVALID_TOKEN")
            user.password_hash = self.passwords.hash(password)
            tx.users.save(user)
            tx.tokens.clear(user.id, "reset")
            tx.tokens.clear(user.id, "email_change")
            tx.sessions.revoke(user.id, self.clock())
            tx.audit("PASSWORD_RESET", user.id)
            tx.audit("SESSION_REVOKED", user.id)
            if self.policy.email_enabled and self.policy.notify_password_change:
                tx.enqueue("password_changed", {"email": user.email})
            tx.commit()

    def verify_email(self, token):
        with self.uow() as tx:
            entry = tx.tokens.find("verify", self.tokens.digest(token))
            user = tx.users.get(entry[0], lock=True) if entry else None
            if user is None or tx.tokens.consume("verify", self.tokens.digest(token), self.clock()) is None:
                raise BusinessError(400, "لینک تأیید نامعتبر یا منقضی شده است.", "INVALID_TOKEN")
            user.email_verified_at = self.clock()
            tx.users.save(user)
            tx.audit("EMAIL_VERIFIED", user.id)
            tx.commit()

    def change_email(self, uid, password, email):
        if not self.policy.email_enabled:
            raise BusinessError(503, "ارسال ایمیل هنوز فعال نشده است.")
        with self.uow() as tx:
            user = tx.users.get(uid, lock=True)
            if not self.passwords.verify(password, user.password_hash):
                raise BusinessError(400, "رمز عبور فعلی درست نیست.")
            if tx.users.by_email(email):
                return {"message": GENERIC_EMAIL}
            token = self.tokens.new()
            tx.tokens.issue(
                uid, "email_change", self.tokens.digest(token), self.clock() + timedelta(minutes=30), email
            )
            tx.enqueue("email_change_link", {"email": email, "token": token})
            tx.enqueue("email_change_notice", {"email": user.email})
            tx.commit()
        return {"message": GENERIC_EMAIL}

    def confirm_email_change(self, token):
        with self.uow() as tx:
            entry = tx.tokens.find("email_change", self.tokens.digest(token))
            user = tx.users.get(entry[0], lock=True) if entry else None
            if (
                user is None
                or tx.tokens.consume("email_change", self.tokens.digest(token), self.clock()) is None
            ):
                raise BusinessError(400, "لینک تأیید نامعتبر یا منقضی شده است.", "INVALID_TOKEN")
            if tx.users.by_email(entry[1]):
                raise BusinessError(400, "درخواست قابل انجام نیست.")
            user.email, user.email_verified_at = entry[1], self.clock()
            tx.users.save(user)
            tx.sessions.revoke(user.id, self.clock())
            for purpose in ["reset", "verify", "email_change"]:
                tx.tokens.clear(user.id, purpose)
            tx.audit("EMAIL_CHANGED", user.id)
            tx.audit("SESSION_REVOKED", user.id)
            tx.commit()

    def google_login(self, credential, previous=None):
        identity = self.google.verify(credential)
        with self.uow() as tx:
            user = tx.users.by_google(identity["subject"])
            if user is None:
                if tx.users.by_email(identity["email"]):
                    raise BusinessError(409, "ورود با این روش امکان‌پذیر نیست.")
                user = tx.users.save(
                    User(
                        None,
                        identity["email"],
                        full_name=identity["name"],
                        google_subject=identity["subject"],
                        email_verified_at=self.clock(),
                    )
                )
            else:
                user = tx.users.get(user.id, lock=True)
                if user.email == identity["email"] and user.email_verified_at is None:
                    user.email_verified_at = self.clock()
                    tx.users.save(user)
                    tx.audit("EMAIL_VERIFIED", user.id)
            token = self._session(tx, user, previous)
            tx.audit("LOGIN_SUCCESS", user.id)
            tx.commit()
            return user, token

    def profile(self, uid, name=None):
        with self.uow() as tx:
            user = tx.users.get(uid, lock=name is not None)
            if name is not None:
                user.full_name = name
                tx.users.save(user)
                tx.commit()
            return user

    def require_permission(self, uid, permission):
        with self.uow() as tx:
            if not tx.permitted(uid, permission):
                raise BusinessError(403, "دسترسی مجاز نیست.", "FORBIDDEN")
