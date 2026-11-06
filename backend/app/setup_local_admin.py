"""Create/reset a DEVELOPMENT admin on localhost only; never use production credentials.

Run from backend: python -m app.setup_local_admin your-email@example.com
Passwords are prompted, hashed and never accepted in argv or printed.
"""
import argparse
from getpass import getpass

from sqlalchemy import delete, select, update
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import make_engine
from app.domain.management import MANAGEMENT_PERMISSIONS
from app.infrastructure.crypto import PasswordAdapter
from app.infrastructure.models import (
    ActionToken,
    AuditLog,
    AuthSession,
    PasswordReset,
    Role,
    RolePermission,
    User,
    UserRole,
    utcnow,
)
from app.presentation.schemas import normalize_email


def local_url(settings):
    if settings.environment != "development":
        raise ValueError("This command is only available in ENVIRONMENT=development.")
    for secret in (settings.database_url, settings.migration_database_url):
        if secret and make_url(secret.get_secret_value()).host not in {"localhost", "127.0.0.1", "::1"}:
            raise ValueError("Both database URLs must point to localhost. Remote/Neon databases are refused.")
    return (settings.migration_database_url or settings.database_url).get_secret_value()


def save(engine, email, password):
    if not 12 <= len(password) <= 128:
        raise ValueError("Password must contain 12 to 128 characters.")
    email = normalize_email(email)
    hashed = PasswordAdapter().hash(password)
    with Session(engine) as db, db.begin():
        user = db.scalar(select(User).where(User.email == email).with_for_update())
        if user is None:
            user = User(email=email, full_name="مدیر آزمایشی نکسورا", password_hash=hashed)
            db.add(user)
            db.flush()
        else:
            user.password_hash = hashed
        role = "nexora_manager"
        if db.get(Role, role) is None:
            db.add(Role(name=role))
            db.flush()
        for permission in MANAGEMENT_PERMISSIONS:
            if db.get(RolePermission, (role, permission)) is None:
                db.add(RolePermission(role=role, permission=permission))
        if db.get(UserRole, (user.id, role)) is None:
            db.add(UserRole(user_id=user.id, role=role))
        db.execute(update(AuthSession).where(AuthSession.user_id == user.id).values(revoked_at=utcnow()))
        db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))
        db.execute(delete(ActionToken).where(ActionToken.user_id == user.id))
        db.add(AuditLog(event="LOCAL_ADMIN_CONFIGURED", user_id=user.id))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email")
    args = parser.parse_args()
    try:
        url = local_url(Settings())
        password = getpass("Local admin password (12-128 characters): ")
        if password != getpass("Repeat password: "):
            parser.error("Passwords do not match. Nothing changed.")
        engine = make_engine(url)
        try:
            save(engine, args.email, password)
        finally:
            engine.dispose()
    except ValueError as error:
        parser.error(str(error))
    print("Local admin ready. Online accounts were not changed.")


if __name__ == "__main__":
    main()
