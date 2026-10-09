from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def make_engine(url: str):
    return create_engine(url, pool_pre_ping=True, hide_parameters=True)
