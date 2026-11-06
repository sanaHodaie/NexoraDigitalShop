from io import BytesIO
from xml.etree import ElementTree
from zipfile import ZipFile

import pytest
from conftest import CHECKOUT, register, write
from openpyxl import Workbook, load_workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models import AuditLog, Product, Subscriber, User
from app.infrastructure.product_spreadsheet import HEADERS, XLSX_TYPE
from app.setup_local_admin import save


@pytest.fixture
def admin(client, engine):
    save(engine, "manager@example.test", "manager-password-12345")
    response = client.post('/api/mobile/session', json={"email": "manager@example.test", "password": "manager-password-12345"})
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["token"]}


def test_filter_options_and_kind_are_real_database_filters(client, engine, admin):
    with Session(engine) as db, db.begin():
        product = db.get(Product, 'phone-01')
        product.payload = {**product.payload, 'kindLabel': 'نوع تست'}
    options = client.get('/api/admin/products/filters', headers=admin).json()
    assert 'نوع تست' in options['kinds']['smartphones']
    result = client.get('/api/admin/products?category=smartphones&kind=نوع تست', headers=admin).json()
    assert result['total'] == 1 and result['items'][0]['id'] == 'phone-01'
    assert client.get('/api/admin/products/phone-01', headers=admin).json()['description']
    assert client.get('/api/admin/products/no-such-item', headers=admin).status_code == 404


def test_newsletter_cursor_is_per_admin_monotonic_and_does_not_hide_new_arrivals(client, engine, admin):
    with Session(engine) as db, db.begin():
        uid = db.scalar(select(User.id).where(User.email == 'manager@example.test'))
        db.add(Subscriber(user_id=uid, email='first@example.test'))
    first = client.get('/api/admin/newsletter-notifications', headers=admin).json()
    assert first['unread'] == 1
    assert first['items'][0]['email'] == 'first@example.test'
    with Session(engine) as db, db.begin():
        db.add(Subscriber(user_id=uid, email='second@example.test'))
    assert client.post('/api/admin/newsletter-notifications/read', headers=admin, json={'throughId': first['latestId']}).status_code == 204
    assert client.get('/api/admin/newsletter-notifications', headers=admin).json()['unread'] == 1
    assert client.post('/api/admin/newsletter-notifications/read', headers=admin, json={'throughId': 0}).status_code == 204
    assert client.get('/api/admin/newsletter-notifications', headers=admin).json()['unread'] == 1
    save(engine, 'second-manager@example.test', 'manager-password-12345')
    token = client.post('/api/mobile/session', json={'email': 'second-manager@example.test', 'password': 'manager-password-12345'}).json()['token']
    assert client.get('/api/admin/newsletter-notifications', headers={'Authorization': 'Bearer ' + token}).json()['unread'] == 2


def test_exports_are_real_office_documents_and_inert(client, engine, admin):
    with Session(engine) as db, db.begin():
        person = db.scalar(select(User).where(User.email == 'manager@example.test'))
        person.full_name = '=HYPERLINK("evil")\x01<&'
        db.add(AuditLog(event='REPORT_TEST', user_id=person.id, subject_id='test'))
    xlsx = client.get('/api/admin/audit/export?format=xlsx&event=REPORT_TEST', headers=admin)
    assert xlsx.status_code == 200
    assert xlsx.headers['Cache-Control'] == 'no-store'
    book = load_workbook(BytesIO(xlsx.content), data_only=False)
    assert book.active.max_row == 2
    assert book.active['D2'].data_type == 's'
    assert book.active['D2'].value.startswith("'=")
    assert book.active.sheet_view.rightToLeft
    docx = client.get('/api/admin/audit/export?format=docx&event=REPORT_TEST', headers=admin)
    assert docx.status_code == 200
    with ZipFile(BytesIO(docx.content)) as archive:
        document = archive.read('word/document.xml')
        ElementTree.fromstring(document)
        assert b'REPORT_TEST' in document and b'&lt;&amp;' in document
    assert client.get('/api/admin/audit?event=REPORT_TEST&since=2099-01-01T00:00:00Z', headers=admin).json()['items'] == []


@pytest.mark.parametrize('path', ['/api/admin/newsletter-notifications', '/api/admin/audit/export?format=xlsx', '/api/admin/products/filters', '/api/admin/products/phone-01', '/api/admin/orders/1/invoice.pdf'])
def test_new_endpoints_do_not_bypass_permissions(client, path):
    assert client.get(path).status_code == 401
    register(client)
    assert client.get(path).status_code == 403


def test_site_order_detail_and_vazirmatn_pdf_are_consistent(client, engine, admin):
    register(client, 'buyer@example.test')
    assert write(client, 'PUT', '/api/account/cart/phone-01', json={'quantity': 2}).status_code == 204
    result = write(client, 'POST', '/api/account/orders', json=CHECKOUT)
    assert result.status_code == 200, result.text
    oid = result.json()['id']
    detail = client.get(f'/api/admin/orders/{oid}', headers=admin).json()
    assert detail['shippingAddress']['phone'] == CHECKOUT['shippingAddress']['phone']
    assert detail['shippingAddress']['postalCode'] == '1234567890'
    assert detail['lines'][0]['quantity'] == 2
    pdf = client.get(f'/api/admin/orders/{oid}/invoice.pdf', headers=admin)
    assert pdf.status_code == 200 and pdf.content.startswith(b'%PDF')
    assert b'Vazirmatn' in pdf.content


def test_native_raw_excel_preview_and_commit(client, admin):
    book = Workbook()
    book.active.append(HEADERS)
    book.active.append(['native-import-01', 'تست اپ', 'App test', 'smartphones', 1200000, 4, 'Test', 'توضیح', 'RAM: 8', ''])
    stream = BytesIO()
    book.save(stream)
    headers = {**admin, 'Content-Type': XLSX_TYPE}
    preview = client.post('/api/admin/products/import?commit=false', content=stream.getvalue(), headers=headers)
    assert preview.status_code == 200 and preview.json()['canImport']
    assert client.get('/api/admin/products/native-import-01', headers=admin).status_code == 404
    committed = client.post('/api/admin/products/import?commit=true', content=stream.getvalue(), headers=headers)
    assert committed.status_code == 200 and committed.json()['created'] == 1
    row = client.get('/api/admin/products/native-import-01', headers=admin).json()
    assert not row['isActive'] and row['stock'] == 4


def test_native_bulk_pricing_keeps_confirmation_snapshot(client, admin):
    body = {'category': 'smartphones', 'percent': '10', 'brand': None}
    preview = client.post('/api/admin/products/pricing', headers=admin, json=body)
    assert preview.status_code == 200 and not preview.json()['applied']
    assert client.post('/api/admin/products/pricing', headers=admin, json={**body, 'snapshot': preview.json()['snapshot']}).json()['applied']
    assert client.post('/api/admin/products/pricing', headers=admin, json={**body, 'snapshot': preview.json()['snapshot']}).status_code == 409


def test_admin_assistant_test_uses_existing_catalogue_service(client, admin):
    result = client.post('/api/admin/assistant/test', headers=admin, json={'messages': [{'role': 'user', 'content': 'گوشی برای عکاسی'}]})
    assert result.status_code == 200
    assert result.json()['text'] and isinstance(result.json()['products'], list)


def test_operator_password_reset_updates_hash_and_invalidates_sessions(client, engine, admin, monkeypatch):
    from types import SimpleNamespace

    from pydantic import SecretStr

    from app import provision_admin
    values = iter(['new-manager-password-12345', 'new-manager-password-12345'])
    monkeypatch.setattr('sys.argv', ['provision_admin', 'manager@example.test', '--set-password'])
    monkeypatch.setattr(provision_admin, 'Settings', lambda: SimpleNamespace(migration_database_url=SecretStr('sqlite://')))
    monkeypatch.setattr(provision_admin, 'make_engine', lambda _: engine)
    monkeypatch.setattr(provision_admin, 'getpass', lambda _: next(values))
    provision_admin.main()
    assert client.get('/api/mobile/session', headers=admin).status_code == 401
    assert client.post('/api/mobile/session', json={'email': 'manager@example.test', 'password': 'new-manager-password-12345'}).status_code == 200
