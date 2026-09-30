from collections.abc import Generator

from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    return create_engine(url, pool_pre_ping=True, hide_parameters=True)


def get_db(request: Request) -> Generator[Session, None, None]:
    with Session(request.app.state.engine, expire_on_commit=False) as db:
        # Closing rolls back any incomplete transaction, including failed orders.
        yield db
