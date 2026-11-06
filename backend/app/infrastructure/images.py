"""Decode only supported raster formats, limit resources, strip metadata and re-encode."""
from collections import OrderedDict
from io import BytesIO
from threading import Lock

from PIL import Image, ImageOps, UnidentifiedImageError

from app.domain.errors import BusinessError

MAX_UPLOAD_BYTES = 2 * 1024 * 1024
_thumbnails = OrderedDict()
_thumbnail_lock = Lock()


def product_thumbnail(key, raw, width):
    """Public, content-addressed variants; cache only small results, never large source keys."""
    if width not in (320, 640):
        raise ValueError('Unsupported thumbnail size')
    cache_key = (key, width)
    with _thumbnail_lock:
        cached = _thumbnails.get(cache_key)
        if cached is not None:
            _thumbnails.move_to_end(cache_key)
            return cached
    with Image.open(BytesIO(raw), formats=['WEBP']) as image:
        image.thumbnail((width, width), Image.Resampling.LANCZOS)
        output = BytesIO()
        image.save(output, 'WEBP', quality=76 if width == 320 else 82, method=4)
        result = output.getvalue()
    with _thumbnail_lock:
        _thumbnails[cache_key] = result
        while len(_thumbnails) > 128 or sum(map(len, _thumbnails.values())) > 8 * 1024 * 1024:
            _thumbnails.popitem(last=False)
    return result


def product_image(raw):
    if not raw or len(raw) > MAX_UPLOAD_BYTES:
        raise BusinessError(413, 'حداکثر حجم عکس ۲ مگابایت است.')
    try:
        with Image.open(BytesIO(raw), formats=['JPEG', 'PNG', 'WEBP']) as source:
            if source.width * source.height > 16000000 or getattr(source, 'is_animated', False):
                raise ValueError('Image dimensions or animation not allowed')
            source.load()
            normalized = ImageOps.exif_transpose(source).convert('RGBA')
            normalized.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            # A fresh image drops EXIF, ICC, comments and other embedded metadata.
            clean = Image.new('RGBA', normalized.size)
            clean.paste(normalized)
            output = BytesIO()
            clean.save(output, 'WEBP', quality=85, method=4)
            result = output.getvalue()
            if len(result) > MAX_UPLOAD_BYTES:
                raise ValueError('Encoded image too large')
            return result
    except (OSError, ValueError, SyntaxError, UnidentifiedImageError, Image.DecompressionBombError):
        raise BusinessError(400, 'یک عکس سالم و غیرمتحرک JPG، PNG یا WebP با حداکثر ۱۶ مگاپیکسل انتخاب کنید.') from None
