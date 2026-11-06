"""Operator-only command: python -m app.provision_admin user@example.com [--revoke]."""
import argparse
from getpass import getpass

from sqlalchemy import delete, select, update
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('email')
    parser.add_argument('--revoke', action='store_true')
    parser.add_argument('--set-password', action='store_true', help='Prompt securely to reset the existing account password.')
    args = parser.parse_args()
    settings = Settings()
    if not settings.migration_database_url:
        parser.error('MIGRATION_DATABASE_URL is required; runtime credentials cannot assign permissions.')
    hashed = None
    if args.set_password:
        if args.revoke:
            parser.error('--set-password cannot be combined with --revoke.')
        password = getpass('New admin password (12-128 characters): ')
        if not 12 <= len(password) <= 128 or password != getpass('Repeat password: '):
            parser.error('Passwords must match and contain 12-128 characters. Nothing changed.')
        hashed = PasswordAdapter().hash(password)
        del password
    engine = make_engine(settings.migration_database_url.get_secret_value())
    try:
        with Session(engine) as db, db.begin():
            user = db.scalar(select(User).where(User.email == args.email.strip().lower()).with_for_update())
            if user is None:
                parser.error('Register this account in Nexora first.')
            role = 'nexora_manager'
            if args.revoke:
                db.execute(delete(UserRole).where(UserRole.user_id == user.id, UserRole.role == role))
            else:
                if hashed:
                    user.password_hash = hashed
                    db.execute(update(AuthSession).where(AuthSession.user_id == user.id).values(revoked_at=utcnow()))
                    db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))
                    db.execute(delete(ActionToken).where(ActionToken.user_id == user.id))
                    db.add(AuditLog(event='ADMIN_PASSWORD_RESET_BY_OPERATOR', user_id=user.id))
                if db.get(Role, role) is None:
                    db.add(Role(name=role))
                    db.flush()
                for permission in MANAGEMENT_PERMISSIONS:
                    if db.get(RolePermission, (role, permission)) is None:
                        db.add(RolePermission(role=role, permission=permission))
                if db.get(UserRole, (user.id, role)) is None:
                    db.add(UserRole(user_id=user.id, role=role))
        print('Management permissions updated.')
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()
