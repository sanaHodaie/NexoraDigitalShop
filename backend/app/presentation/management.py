from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.domain.errors import BusinessError
from app.presentation.dependencies import current_user, services
from app.presentation.management_schemas import DOCUMENT_MODELS, BulkPriceInput, DocumentInput, ProductInput
from app.presentation.schemas import PaymentInput
from app.infrastructure.images import MAX_UPLOAD_BYTES, product_image
from app.infrastructure.rate_limit import enforce
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix='/api/admin', tags=['management'])


@router.get('/products/pricing/brands')
def pricing_brands(category: str = Query(..., max_length=50), user=Depends(current_user), svc=Depends(services)):
    from app.domain.management import CATEGORY_IDS
    if category not in CATEGORY_IDS:
        raise BusinessError(400, 'دسته‌بندی نامعتبر است.')
    return {'items': svc.pricing.brands(user.id, category)}


@router.post('/products/pricing')
def bulk_pricing(data: BulkPriceInput, request: Request, user=Depends(current_user), svc=Depends(services)):
    enforce(request, 'bulk_pricing', str(user.id))
    return svc.pricing.change(user.id, data.category, data.brand, data.percent, data.snapshot)


@router.get('/products/import/template')
def product_template(user=Depends(current_user), svc=Depends(services)):
    from app.infrastructure.product_spreadsheet import XLSX_TYPE, spreadsheet_template
    if 'products:write' not in svc.management.me(user.id)['permissions']:
        raise BusinessError(403, 'دسترسی افزودن محصول لازم است.')
    return Response(spreadsheet_template(), media_type=XLSX_TYPE,
                    headers={'Content-Disposition': 'attachment; filename="nexora-products.xlsx"'})


@router.post('/products/import')
async def import_products(request: Request, commit: bool = False,
                          user=Depends(current_user), svc=Depends(services)):
    from app.infrastructure.product_spreadsheet import MAX_BYTES, XLSX_TYPE
    from app.presentation.product_import import parse_products
    permissions = await run_in_threadpool(svc.management.me, user.id)
    if 'products:write' not in permissions['permissions']:
        raise BusinessError(403, 'دسترسی افزودن محصول لازم است.')
    enforce(request, 'product_import', str(user.id))
    if request.headers.get('content-type', '').split(';')[0] != XLSX_TYPE:
        raise BusinessError(415, 'فقط فایل اکسل با فرمت XLSX پذیرفته می‌شود.')
    raw = bytearray()
    async for chunk in request.stream():
        if len(raw) + len(chunk) > MAX_BYTES:
            raise BusinessError(413, 'حداکثر حجم فایل اکسل ۲ مگابایت است.')
        raw.extend(chunk)
    rows, errors = await run_in_threadpool(parse_products, bytes(raw))
    return await run_in_threadpool(svc.management.import_products, user.id, rows, errors, commit)


@router.post('/media', status_code=201)
async def upload_image(request: Request, user=Depends(current_user), svc=Depends(services)):
    # Authorize before buffering or decoding the request.
    permissions = await run_in_threadpool(svc.management.me, user.id)
    if 'products:write' not in permissions['permissions']:
        raise BusinessError(403, 'Upload permission required')
    enforce(request, 'product_upload', str(user.id))
    if request.headers.get('content-type', '').split(';')[0] not in {'image/jpeg', 'image/png', 'image/webp'}:
        raise BusinessError(415, 'Only JPG, PNG and WebP images are accepted')
    raw = bytearray()
    async for chunk in request.stream():
        if len(raw) + len(chunk) > MAX_UPLOAD_BYTES:
            raise BusinessError(413, 'حداکثر حجم عکس ۲ مگابایت است.')
        raw.extend(chunk)
    return await run_in_threadpool(svc.management.upload_image, user.id, bytes(raw), product_image)


@router.get('/me')
def me(user=Depends(current_user), svc=Depends(services)):
    return svc.management.me(user.id)


@router.get('/orders/{oid}')
def order_detail(oid: int, user=Depends(current_user), svc=Depends(services)):
    from app.domain.invoices import invoice_data
    return invoice_data(svc.orders.document(user.id, oid, admin=True))


@router.get('/orders/{oid}/invoice')
def order_invoice(oid: int, download: bool = True, user=Depends(current_user), svc=Depends(services)):
    from app.infrastructure.invoice_documents import document_response
    return document_response(svc.orders.document(user.id, oid, admin=True), download=download)


@router.get('/orders/{oid}/warranty')
def warranty_card(oid: int, download: bool = True, user=Depends(current_user), svc=Depends(services)):
    from app.infrastructure.invoice_documents import document_response
    return document_response(svc.orders.document(user.id, oid, admin=True, warranty=True), warranty=True, download=download)


@router.get('/dashboard')
def dashboard(user=Depends(current_user), svc=Depends(services)):
    return svc.management.read(user.id, 'dashboard')


@router.get('/products')
@router.get('/orders')
@router.get('/users')
@router.get('/subscribers')
def listing(request: Request, page: int = Query(1, ge=1, le=100000),
            size: int = Query(24, ge=1, le=100), q: str = Query('', max_length=100),
            category: str | None = Query(None, max_length=50),
            user=Depends(current_user), svc=Depends(services)):
    resource = request.url.path.rsplit('/', 1)[-1]
    filters = {'category': category} if resource == 'products' else {}
    return svc.management.read(user.id, resource, page=page, size=size, query=q, **filters)


@router.post('/products', status_code=201)
def create_product(data: ProductInput, user=Depends(current_user), svc=Depends(services)):
    return svc.management.save_product(user.id, data.id, data.model_dump(), create=True)


@router.put('/products/{pid}')
def update_product(pid: str, data: ProductInput, user=Depends(current_user), svc=Depends(services)):
    if pid != data.id or data.expectedStock is None:
        raise BusinessError(400, 'شناسه و موجودی اولیهٔ محصول لازم است.')
    return svc.management.save_product(user.id, pid, data.model_dump())


@router.delete('/products/{pid}', status_code=204)
def archive(pid: str, user=Depends(current_user), svc=Depends(services)):
    svc.management.archive_product(user.id, pid)
    return Response(status_code=204)


@router.get('/audit')
def audit(before: int = Query(0, ge=0), after: int = Query(0, ge=0), event: str = Query('', max_length=64),
          size: int = Query(50, ge=1, le=100), user=Depends(current_user), svc=Depends(services)):
    return svc.management.read(user.id, 'audit_logs', before=before, after=after, event=event, size=size)


@router.get('/activity')
def activity(user=Depends(current_user), svc=Depends(services)):
    return svc.management.read(user.id, 'activity')


@router.post('/users/{uid}/revoke-sessions', status_code=204)
def revoke(uid: int, user=Depends(current_user), svc=Depends(services)):
    svc.management.revoke_sessions(user.id, uid)
    return Response(status_code=204)


@router.post('/orders/{oid}/cancel', status_code=204)
def cancel(oid: int, user=Depends(current_user), svc=Depends(services)):
    svc.management.cancel_order(user.id, oid)
    return Response(status_code=204)


@router.post('/orders/{oid}/confirm-payment', status_code=204)
def payment(oid: int, data: PaymentInput, user=Depends(current_user), svc=Depends(services)):
    svc.management.me(user.id)
    svc.orders.confirm_payment(user.id, oid, data.reference)
    return Response(status_code=204)


@router.get('/content')
def content(user=Depends(current_user), svc=Depends(services)):
    return svc.management.read(user.id, 'documents')


@router.put('/content/{key}')
def save_content(key: str, body: DocumentInput, user=Depends(current_user), svc=Depends(services)):
    model = DOCUMENT_MODELS.get(key)
    if model is None:
        raise BusinessError(404, 'محتوا پیدا نشد.')
    try:
        data = model.model_validate(body.data).model_dump(mode='json')
    except ValidationError as error:
        raise RequestValidationError(error.errors()) from None
    return svc.management.save_document(user.id, key, data, body.version)
