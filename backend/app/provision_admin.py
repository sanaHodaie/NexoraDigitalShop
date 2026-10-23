"""Operator-only command: python -m app.provision_admin user@example.com [--revoke]."""
import argparse

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import make_engine
from app.domain.management import MANAGEMENT_PERMISSIONS
from app.infrastructure.models import Role, RolePermission, User, UserRole


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('email')
    parser.add_argument('--revoke', action='store_true')
    args = parser.parse_args()
    settings = Settings()
    if not settings.migration_database_url:
        parser.error('MIGRATION_DATABASE_URL is required; runtime credentials cannot assign permissions.')
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
