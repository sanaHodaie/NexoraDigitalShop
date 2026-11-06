from fastapi import APIRouter, Depends, Query, Request, Response

from app.application.shopping import CATALOG_LIMIT
from app.infrastructure.rate_limit import enforce
from app.presentation.dependencies import current_user, services
from app.presentation.schemas import EmailInput

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get('/media/{filename}')
def media(filename: str, width: int | None = Query(None), svc=Depends(services)):
    import re

    from app.domain.errors import BusinessError
    if not re.fullmatch(r'[a-f0-9]{64}\.webp', filename):
        raise BusinessError(404, 'Image not found')
    if width is not None and width not in (320, 640):
        raise BusinessError(400, 'Unsupported image size')
    content = svc.management.media(filename[:-5])
    if width:
        from app.infrastructure.images import product_thumbnail
        content = product_thumbnail(filename[:-5], content, width)
    return Response(content, media_type='image/webp', headers={'ETag': f'"{filename}-{width or "original"}"'})


@router.get('/content')
def content(svc=Depends(services)):
    return svc.management.public_content()


@router.get("/products")
def products(q: str | None = None, category: str | None = None, limit: int = CATALOG_LIMIT, svc=Depends(services)):
    return [p.public() for p in svc.shopping.products(q, category, limit)]


@router.get("/products/{pid}")
def product(pid: str, svc=Depends(services)):
    return svc.shopping.product(pid).public()


@router.post("/newsletter", status_code=202)
def newsletter(data: EmailInput, request: Request, user=Depends(current_user), svc=Depends(services)):
    enforce(request, "newsletter", str(user.id))
    svc.shopping.newsletter(user.id, data.email)
    return Response(status_code=202)
