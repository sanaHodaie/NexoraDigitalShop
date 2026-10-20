"""Decode only supported raster formats, limit resources, strip metadata and re-encode."""
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.domain.errors import BusinessError

MAX_UPLOAD_BYTES = 2 * 1024 * 1024


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
