"""Translate spreadsheet columns to the same validated contract as manual products."""
import re

from pydantic import ValidationError

from app.domain.errors import BusinessError
from app.infrastructure.product_spreadsheet import CATEGORIES, HEADERS, read_spreadsheet
from app.presentation.management_schemas import ProductInput

FIELDS = ['id', 'name', 'nameEn', 'category', 'priceRial', 'stock', 'brand', 'description', 'specs', 'badge']
PLACEHOLDER = '/assets/products/product-pending.svg'


def normalize(value):
    return str(value or '').strip().replace('ي', 'ی').replace('ك', 'ک').replace('\u200c', ' ')


ALIASES = {normalize(label).lower(): field for label, field in zip(HEADERS, FIELDS)}
ALIASES.update({field.lower(): field for field in FIELDS})
ALIASES.update({'قیمت به ریال': 'priceRial', 'قیمت پایه به ریال': 'priceRial', 'دسته بندی': 'category',
                'شناسه محصول': 'id', 'نام محصول': 'name', 'مشخصات فنی': 'specs'})
CATEGORY_ALIASES = {normalize(label): key for key, label in CATEGORIES.items()}


def integer(value):
    if isinstance(value, bool):
        raise ValueError()
    text = str(value).strip().translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
    # Accept Excel numeric integers and conventionally grouped Persian/English numbers.
    if re.fullmatch(r'\d+\.0', text):
        text = text[:-2]
    if re.fullmatch(r'\d{1,3}(?:[,٬]\d{3})+', text):
        text = text.replace(',', '').replace('٬', '')
    if not re.fullmatch(r'\d+', text):
        raise ValueError()
    return int(text)


def parse_products(raw):
    sheet = read_spreadsheet(raw)
    if not sheet:
        raise BusinessError(400, 'فایل خالی است.')
    columns = []
    for value, kind in sheet[0]:
        if value is None:
            columns.append(None)
            continue
        field = ALIASES.get(normalize(value).lower())
        if kind == 'f' or not field or field in columns:
            raise BusinessError(400, 'عنوان ستون ناشناخته یا تکراری است؛ از ستون‌های قالب نمونه استفاده کنید.')
        columns.append(field)
    if not set(FIELDS[:6]).issubset(columns):
        raise BusinessError(400, 'ستون‌های شناسه، نام فارسی، نام انگلیسی، دسته‌بندی، قیمت ریال و موجودی الزامی‌اند.')
    rows, errors, seen = [], [], set()
    for number, cells in enumerate(sheet[1:], start=2):
        if all(value is None or value == '' for value, _ in cells):
            continue
        if any(kind in {'f', 'e'} for _, kind in cells):
            errors.append({'row': number, 'field': '', 'message': 'فرمول یا خطای اکسل مجاز نیست؛ مقدار نهایی را وارد کنید.'})
            continue
        if any(value is not None and columns[i] is None for i, (value, _) in enumerate(cells)):
            errors.append({'row': number, 'field': '', 'message': 'ستونی بدون عنوان دارای مقدار است.'})
            continue
        values = {field: value for field, (value, _) in zip(columns, cells) if field}
        data = {field: str(values.get(field) or '').strip() for field in FIELDS}
        data['category'] = CATEGORY_ALIASES.get(normalize(data['category']), data['category'])
        data.update(categoryFa=CATEGORIES.get(data['category'], ''), image=PLACEHOLDER, isActive=False)
        data['specs'] = [part.strip() for part in re.split(r'[\n;؛]', data['specs']) if part.strip()]
        valid_numbers = True
        for field in ('priceRial', 'stock'):
            try:
                data[field] = integer(values.get(field))
            except ValueError:
                errors.append({'row': number, 'field': field, 'message': 'عدد صحیح غیرمنفی وارد کنید؛ قیمت به ریال است.'})
                valid_numbers = False
        if not valid_numbers:
            continue
        try:
            product = ProductInput.model_validate(data)
        except ValidationError as error:
            for item in error.errors():
                field = str(item['loc'][0]) if item['loc'] else ''
                label = HEADERS[FIELDS.index(field)] if field in FIELDS else field
                errors.append({'row': number, 'field': field, 'message': f'مقدار «{label}» نامعتبر است؛ راهنمای قالب را بررسی کنید.'})
            continue
        if product.id in seen:
            errors.append({'row': number, 'field': 'id', 'message': 'شناسه در همین فایل تکرار شده است.'})
        seen.add(product.id)
        rows.append({'row': number, 'product': product.model_dump()})
    if not rows and not errors:
        raise BusinessError(400, 'هیچ ردیف محصولی در برگهٔ اول پیدا نشد.')
    return rows, errors
