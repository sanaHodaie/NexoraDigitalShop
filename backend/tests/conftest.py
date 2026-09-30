import os
import uuid
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text

from alembic import command
from app.config import Settings
from app.main import create_app
from app.seed import seed


@pytest.fixture
def engine(tmp_path):
    url = os.environ.get("TEST_DATABASE_URL")
    schema = None
    control = None
    if url:
        # An isolated schema, never drop/recreate a user's database.
        url = Settings(database_url=url).database_url.get_secret_value()
        schema = "nexora_test_" + uuid.uuid4().hex
        control = create_engine(url, hide_parameters=True)
        with control.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        db_engine = create_engine(
            url, connect_args={"options": f"-csearch_path={schema}"}, hide_parameters=True
        )
    else:
        db_engine = create_engine(
            f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False}
        )

        @event.listens_for(db_engine, "connect")
        def foreign_keys(connection, record):
            connection.execute("PRAGMA foreign_keys=ON")

    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    try:
        with db_engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        seed(db_engine)
        yield db_engine
    finally:
        db_engine.dispose()
        if schema:
            with control.begin() as connection:
                connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
            control.dispose()


@pytest.fixture
def settings():
    return Settings(
        environment="test",
        database_url="sqlite://",
        secret_key="test-secret-" * 5,
        auth_rate_limit=100,
        newsletter_rate_limit=100,
    )


@pytest.fixture
def app(engine, settings):
    return create_app(settings, engine)


@pytest.fixture
def client(app):
    with TestClient(app, base_url="https://shop.test") as client:
        yield client


def write(client, method, path, **kwargs):
    response = client.get("/api/csrf")
    assert response.status_code == 200
    return client.request(method, path, headers={"X-CSRF-TOKEN": response.json()["token"]}, **kwargs)


def register(client, email="user@example.com"):
    response = write(
        client,
        "POST",
        "/api/auth/register",
        json={"email": email, "password": "test-password-12345", "fullName": "کاربر آزمایشی"},
    )
    assert response.status_code == 200, response.text
    return response
