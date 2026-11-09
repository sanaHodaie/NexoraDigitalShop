from decimal import Decimal

from conftest import CHECKOUT, register, write
from pydantic import SecretStr
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from test_customer_requests import body, submit
from test_wholesale_invoices import approve, setup

from app.infrastructure.models import Order


def test_approved_telegram_invoice_joins_site_orders_without_duplicate_or_payment(client, app, engine):
    rid = setup(client, app, engine)
    assert client.get('/api/admin/order-register').json()['total'] == 0
    assert write(client, 'PUT', '/api/account/cart/phone-01', json={'quantity': 1}).status_code == 204
    oid = write(client, 'POST', '/api/account/orders', json=CHECKOUT).json()['id']
    with Session(engine) as db, db.begin():
        db.get(Order, oid).rial_rate = Decimal('700001')
    app.state.settings.telegram_bot_token = SecretStr('fixture-not-sent')
    approved = approve(client, rid).json()
    assert approved['status'] == 'approved'
    pending = submit(client, body(789)).json()
    assert pending['status'] == 'new'
    saved_pdf = client.get(f'/api/admin/customer-requests/{rid}/invoice').content
    for _ in range(2):
        assert approve(client, rid).status_code == 200
        response = client.get('/api/admin/order-register')
        assert response.status_code == 200, response.text
        result = response.json()
        assert result['total'] == 2
        assert {(item['source'], item['id']) for item in result['items']} == {('site', oid), ('telegram', rid)}
        telegram = next(item for item in result['items'] if item['source'] == 'telegram')
        assert telegram['status'] == 'approved' and telegram['trackingCode'] == approved['trackingCode']
        assert telegram['totalRial'] == approved['invoice']['totalRial']
        site = next(item for item in result['items'] if item['source'] == 'site')
        assert site['totalRial'] == str(client.get(f'/api/admin/orders/{oid}').json()['totalRial'])
    assert client.get(f'/api/admin/customer-requests/{rid}/invoice').content == saved_pdf
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(Order)) == 1
    assert client.get('/api/admin/order-register?size=1').json()['total'] == 2
    assert len(client.get('/api/admin/order-register?page=2&size=1').json()['items']) == 1
    assert client.get('/api/admin/order-register?source=telegram').json()['total'] == 1
    assert client.get('/api/admin/order-register?source=site').json()['total'] == 1
    assert client.get('/api/admin/order-register?q=' + approved['trackingCode']).json()['total'] == 1
    assert client.get('/api/admin/order-register?q=۰۹۱۲۰۰۰۰۰۰۰').json()['total'] == 1
    assert client.get('/api/admin/order-register?q=not-present').json()['total'] == 0
    assert client.get('/api/admin/order-register?source=invalid').status_code == 400


def test_order_register_requires_management_read_permission(client):
    assert client.get('/api/admin/order-register').status_code == 401
    register(client)
    assert client.get('/api/admin/order-register').status_code == 403


def test_wholesale_print_uses_site_template_and_preserves_pdf_snapshot(client, app, engine):
    rid = setup(client, app, engine)
    url = f'/api/admin/customer-requests/{rid}/invoice.html'
    assert client.get(url).status_code == 404
    app.state.settings.telegram_bot_token = SecretStr('fixture-not-sent')
    result = write(client, 'POST', f'/api/admin/customer-requests/{rid}/approve', json={
        'version': 1, 'lines': [{'name': '<script>نمونه</script>', 'quantity': 2, 'unitPriceRial': 25000000}],
        'shippingRial': 0, 'terms': '<script>شرایط توافقی</script>',
    })
    assert result.status_code == 200, result.text
    pdf = client.get(f'/api/admin/customer-requests/{rid}/invoice').content
    html = client.get(url + '?download=false')
    assert html.status_code == 200
    assert html.headers['Cache-Control'] == 'no-store'
    assert html.headers['Content-Disposition'].startswith('inline;')
    assert 'class="masthead"' in html.text and 'class="recipient"' in html.text
    assert 'فاکتور فروش عمده' in html.text and 'مهر و امضای مدیریت' in html.text
    assert 'پرداخت بررسی نشده' in html.text and result.json()['trackingCode'] in html.text
    assert '<script>' not in html.text and '&lt;script&gt;' in html.text
    assert client.get(url).headers['Content-Disposition'].startswith('attachment;')
    assert client.get(f'/api/admin/customer-requests/{rid}/invoice').content == pdf
    client.cookies.clear()
    assert client.get(url).status_code == 401
    register(client, 'no-permission@example.test')
    assert client.get(url).status_code == 403


def test_telegram_request_pagination_size_and_search(client, app, engine):
    rid = setup(client, app, engine)
    for uid in range(1000, 1025):
        assert submit(client, body(uid)).status_code == 200
    path = '/api/admin/customer-requests'
    assert len(client.get(path).json()['items']) == 20
    result = client.get(path + '?size=50').json()
    assert result['size'] == 50 and result['total'] == 26 and len(result['items']) == 26
    result = client.get(path + '?size=20&page=2').json()
    assert len(result['items']) == 6
    assert client.get(path + '?q=not-found&size=100').json()['total'] == 0
    assert client.get(path + f'?q={rid}').json()['total'] > 0
    assert client.get(path + '?size=101').status_code == 400
