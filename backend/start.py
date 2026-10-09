"""Migrate with separate credentials, then supervise API and durable worker processes."""

import os
import subprocess
import sys
import time
from pathlib import Path

from alembic.config import Config
from sqlalchemy.engine import make_url

from alembic import command
from app.core.config import Settings
from app.core.logging import configure_logging
from app.infrastructure.database import make_engine
from app.infrastructure.database_security import check_runtime_role
from app.infrastructure.grants import grant_runtime
from app.seed import seed


def main():
    os.chdir(Path(__file__).resolve().parent)
    configure_logging()
    settings = Settings()
    if settings.migrate_on_start:
        if settings.environment == "production" and not settings.migration_database_url:
            raise RuntimeError(
                "Set MIGRATION_DATABASE_URL or run migrations separately with MIGRATE_ON_START=false"
            )
        command.upgrade(Config("alembic.ini"), "head")
        engine = make_engine((settings.migration_database_url or settings.database_url).get_secret_value())
        try:
            seed(engine)
            if settings.migration_database_url:
                grant_runtime(engine, make_url(settings.database_url.get_secret_value()).username)
        finally:
            engine.dispose()
    if settings.environment == "production":
        engine = make_engine(settings.database_url.get_secret_value())
        try:
            check_runtime_role(engine)
        finally:
            engine.dispose()
    # The running HTTP/worker processes do not receive the deployment credential.
    environment = {key: value for key, value in os.environ.items() if key.upper() != "MIGRATION_DATABASE_URL"}
    children = []
    try:
        children.append(
            subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--host",
                    "0.0.0.0",
                    "--port",
                    os.environ.get("PORT", "8000"),
                    "--no-proxy-headers",
                    "--no-access-log",
                ],
                env=environment,
            )
        )
        if settings.run_worker:
            children.append(
                subprocess.Popen([sys.executable, "-m", "app.infrastructure.worker"], env=environment)
            )
        while all(child.poll() is None for child in children):
            time.sleep(1)
        raise RuntimeError("API or worker exited unexpectedly; supervisor is stopping")
    except KeyboardInterrupt:
        pass
    finally:
        for child in children:
            if child.poll() is None:
                child.terminate()
        for child in children:
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == "__main__":
    main()
