import hashlib
from io import BytesIO

from PIL import Image
from sqlalchemy.orm import Session

from app.infrastructure.images import product_image
from app.infrastructure.models import ProductMedia


def test_public_media_variants_preserve_original_and_have_distinct_cache_identity(client, engine):
    source = Image.effect_noise((1400, 900), 60).convert('RGB')
    raw = BytesIO()
    source.save(raw, 'JPEG', quality=88)
    original = product_image(raw.getvalue())
    key = hashlib.sha256(original).hexdigest()
    with Session(engine) as db, db.begin():
        db.add(ProductMedia(key=key, content=original))
    path = '/api/media/' + key + '.webp'
    full = client.get(path)
    assert full.content == original
    small = client.get(path + '?width=320')
    preview = client.get(path + '?width=640')
    assert small.status_code == preview.status_code == 200
    assert Image.open(BytesIO(small.content)).size == (320, 206)
    assert max(Image.open(BytesIO(preview.content)).size) == 640
    assert len(small.content) < len(original) / 3
    assert small.headers['etag'] != preview.headers['etag'] != full.headers['etag']
    assert 'immutable' in small.headers['cache-control']
    assert client.get(path + '?width=320').content == small.content
    assert client.get(path + '?width=999999').status_code == 400
    assert client.get(path + '?width=0').status_code == 400
