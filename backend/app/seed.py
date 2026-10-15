import json
from decimal import Decimal
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import make_engine
from app.models import Product

PHOTO_PRODUCT_IDS = {f"{prefix}-{i:02d}" for prefix in ("gaming", "phone", "home", "audio", "computer") for i in range(1, 11)}
PHOTO_PRODUCT_IDS.update(f"watch-{i:02d}" for i in range(1, 11))


def correct_phone_model(current, product):
    """Correct the two demo Plus records without overwriting merchant edits."""
    previous = {
        **product,
        "name": product["name"].replace("پرو مکس", "پلاس"),
        "nameEn": product["nameEn"].replace("Pro Max", "Plus"),
        "description": product["description"].replace("پرو مکس", "پلاس"),
    }
    if product["id"] == "phone-04":
        previous["specs"] = [spec.replace("۴۸", "۱۲") for spec in product["specs"]]
        previous["description"] = previous["description"].replace("۴۸", "۱۲")
    if current.name != previous["name"] or current.name_en != previous["nameEn"]:
        return
    current.name = product["name"]
    current.name_en = product["nameEn"]
    current.payload = {
        **current.payload,
        **{key: product[key] for key in ("name", "nameEn", "description", "specs")
           if current.payload.get(key) == previous[key]},
    }


def seed(engine):
    data_dir = Path(__file__).resolve().parents[1] / "data"
    products = []
    for filename in ("products.json", "catalog-products.json"):
        products.extend(json.loads((data_dir / filename).read_text(encoding="utf-8")))
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
            # Upgrade only the original catalogue placeholders, preserving custom images
            # and every other field (including edited prices, stock and descriptions).
            if product["id"] in PHOTO_PRODUCT_IDS:
                current = db.get(Product, product["id"], with_for_update=True)
                placeholder = f"/assets/products/{product['id']}.svg"
                if current.payload.get("image") == placeholder:
                    current.payload = {**current.payload, "image": product["image"]}
                if product["id"] in {"phone-02", "phone-04"}:
                    correct_phone_model(current, product)


if __name__ == "__main__":
    settings = Settings()
    engine = make_engine((settings.migration_database_url or settings.database_url).get_secret_value())
    try:
        seed(engine)
    finally:
        engine.dispose()
