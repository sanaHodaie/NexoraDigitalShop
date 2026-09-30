import json
from decimal import Decimal
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import make_engine
from app.models import Product


def seed(engine):
    products = json.loads(
        (Path(__file__).resolve().parents[1] / "data/products.json").read_text(encoding="utf-8")
    )
    with Session(engine) as db, db.begin():
        for product in products:
            # Re-running deployments must not reset edited prices or inventory.
            db.execute(
                insert(Product)
                .values(
                    id=product["id"],
                    name=product["name"],
                    name_en=product["nameEn"],
                    category=product["category"],
                    price=Decimal(str(product["price"])),
                    stock=100,
                    payload=product,
                )
                .on_conflict_do_nothing(index_elements=["id"])
            )


if __name__ == "__main__":
    engine = make_engine(Settings().database_url.get_secret_value())
    try:
        seed(engine)
    finally:
        engine.dispose()
