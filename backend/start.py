"""Run migrations and idempotent seeds before accepting HTTP requests."""

import os
from pathlib import Path

import uvicorn
from alembic.config import Config

from alembic import command
from app.config import Settings
from app.db import make_engine
from app.seed import seed

if __name__ == "__main__":
    os.chdir(Path(__file__).resolve().parent)
    settings = Settings()
    command.upgrade(Config("alembic.ini"), "head")
    engine = make_engine(settings.database_url.get_secret_value())
    try:
        seed(engine)
    finally:
        engine.dispose()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        workers=1,
        proxy_headers=False,
    )
