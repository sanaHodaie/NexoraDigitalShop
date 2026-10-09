from fastapi import APIRouter, Depends, Request, Response

from app.infrastructure.rate_limit import enforce
from app.presentation.dependencies import services
from app.presentation.schemas import EmailInput

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/products")
def products(q: str | None = None, category: str | None = None, limit: int = 100, svc=Depends(services)):
    return [p.public() for p in svc.shopping.products(q, category, limit)]


@router.get("/products/{pid}")
def product(pid: str, svc=Depends(services)):
    return svc.shopping.product(pid).public()


@router.post("/newsletter", status_code=202)
def newsletter(data: EmailInput, request: Request, svc=Depends(services)):
    enforce(request, "newsletter")
    svc.shopping.newsletter(data.email)
    return Response(status_code=202)
