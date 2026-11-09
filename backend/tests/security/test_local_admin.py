import pytest
from conftest import write
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.infrastructure.crypto import PasswordAdapter
from app.infrastructure.models import User, UserRole
from app.setup_local_admin import local_url, save


def test_local_setup_refuses_remote_credentials_and_production():
    base = {"_env_file": None, "database_url": "postgresql://local:local@localhost/nexora"}
    assert "localhost" in local_url(Settings(**base))
    with pytest.raises(ValueError, match="localhost"):
        local_url(Settings(**base, migration_database_url="postgresql://user:pass@remote.test/nexora"))
    with pytest.raises(ValueError, match="development"):
        local_url(Settings(**base, environment="test"))


def test_local_setup_hashes_password_and_can_reset_same_account(engine, client):
    save(engine, "local@example.test", "local-password-12345")
    save(engine, "LOCAL@example.test", "new-local-password-12345")
    with Session(engine) as db:
        users = list(db.scalars(select(User).where(User.email == "local@example.test")))
        assert len(users) == 1
        assert PasswordAdapter().verify("new-local-password-12345", users[0].password_hash)
        assert db.get(UserRole, (users[0].id, "nexora_manager")) is not None
    result = write(client, "POST", "/api/auth/login", json={"email": "local@example.test", "password": "new-local-password-12345"})
    assert result.status_code == 200
    assert "orders:confirm_payment" in client.get("/api/admin/me").json()["permissions"]
