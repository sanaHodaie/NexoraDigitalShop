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
from app.presentation.schemas import normalize_email


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('email')
    parser.add_argument('--revoke', action='store_true')
    parser.add_argument('--set-password', action='store_true', help='Prompt securely to reset the existing account password.')
    parser.add_argument('--create', action='store_true', help='Create a missing admin directly; requires --set-password.')
    args = parser.parse_args()
    if args.create and (not args.set_password or args.revoke):
        parser.error('--create requires --set-password and cannot be combined with --revoke.')
    try:
        email = normalize_email(args.email)
    except ValueError:
        parser.error('A valid email address is required.')
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
            user = db.scalar(select(User).where(User.email == email).with_for_update())
            created = user is None
            if created:
                if not args.create:
                    parser.error('Account not found. An operator can create it with --create --set-password.')
                user = User(email=email, full_name='مدیر نکسورا', password_hash=hashed)
                db.add(user)
                db.flush()
            elif args.create:
                parser.error('Account already exists. Nothing changed; omit --create to manage it.')
            role = 'nexora_manager'
            if args.revoke:
                db.execute(delete(UserRole).where(UserRole.user_id == user.id, UserRole.role == role))
            else:
                if hashed:
                    user.password_hash = hashed
                    db.execute(update(AuthSession).where(AuthSession.user_id == user.id).values(revoked_at=utcnow()))
                    db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))
                    db.execute(delete(ActionToken).where(ActionToken.user_id == user.id))
                    db.add(AuditLog(event='ADMIN_CREATED_BY_OPERATOR' if created else 'ADMIN_PASSWORD_RESET_BY_OPERATOR', user_id=user.id))
                if db.get(Role, role) is None:
                    db.add(Role(name=role))
                    db.flush()
                for permission in MANAGEMENT_PERMISSIONS:
                    if db.get(RolePermission, (role, permission)) is None:
                        db.add(RolePermission(role=role, permission=permission))
                if db.get(UserRole, (user.id, role)) is None:
                    db.add(UserRole(user_id=user.id, role=role))
        print('Admin account created and management permissions granted.' if args.create else 'Management permissions updated.')
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()
