"""Isolated local browser-test server. No real accounts or credentials are used."""
import tempfile
from pathlib import Path

import uvicorn
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.config import Settings
from app.main import create_app
from app.infrastructure.models import Role, RolePermission, UserRole
from app.domain.management import MANAGEMENT_PERMISSIONS
from app.seed import seed


def main():
    with tempfile.TemporaryDirectory(prefix='nexora-admin-ui-') as directory:
        url='sqlite:///' + str(Path(directory)/'test.db')
        settings=Settings(_env_file=None,environment='test',database_url=url,
                          secret_key='browser-tests-only-not-a-real-secret',require_verified_email=False,
                          auth_rate_limit=100,login_ip_limit=100,login_account_limit=100,email_account_limit=100)
        # HTTP cookies only for this localhost-only isolated test server.
        settings=settings.model_copy(update={'environment':'development'})
        engine=create_engine(url,connect_args={'check_same_thread':False})
        config=Config('alembic.ini')
        with engine.begin() as connection:
            config.attributes['connection']=connection
            command.upgrade(config,'head')
        seed(engine)
        app=create_app(settings,engine)
        identity=app.state.services.identity
        identity.register('browser-admin@example.test','browser-test-password-123','مدیر آزمایش')
        identity.register('browser-user@example.test','browser-test-password-123','کاربر آزمایش')
        with app.state.services.uow() as tx:
            user=tx.users.by_email('browser-admin@example.test')
        with Session(engine) as db,db.begin():
            db.add(Role(name='browser-test'));db.flush()
            db.add_all(RolePermission(role='browser-test',permission=p) for p in MANAGEMENT_PERMISSIONS)
            db.add(UserRole(user_id=user.id,role='browser-test'))
        try:
            uvicorn.run(app,host='127.0.0.1',port=8012,log_level='warning')
        finally:
            engine.dispose()


if __name__=='__main__':
    main()
