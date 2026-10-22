from datetime import timedelta
from decimal import Decimal

from conftest import CHECKOUT, register, write
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.entities import utcnow
from app.infrastructure.models import Order, Product
from tests.security.test_management import grant


def cart_and_draft(client):
    write(client, 'PUT', '/api/account/cart/phone-01', json={'quantity': 2})
    oid = write(client, 'POST', '/api/account/invoices', json=CHECKOUT).json()['id']
    return oid, client.get(f'/api/account/orders/{oid}').json()


def increase(client):
    body = {'category': 'smartphones', 'brand': 'Apple', 'percent': '15'}
    preview = write(client, 'POST', '/api/admin/products/pricing', json=body).json()
    result = write(client, 'POST', '/api/admin/products/pricing', json={**body, 'snapshot': preview['snapshot']})
    assert result.status_code == 200


def test_old_cart_and_draft_follow_admin_price_and_require_new_quote_confirmation(client, engine):
    register(client)
    grant(engine)
    oid, old = cart_and_draft(client)
    old_cart = client.get('/api/account/cart').json()[0]
    increase(client)
    cart = client.get('/api/account/cart')
    assert cart.headers['cache-control'] == 'no-store'
    assert cart.json()[0]['quantity'] == old_cart['quantity']
    assert cart.json()[0]['product']['price'] > old_cart['product']['price']
    assert write(client, 'POST', f'/api/account/orders/{oid}/submit', json={'priceRevision': old['priceRevision']}).status_code == 409
    fresh = write(client, 'POST', f'/api/account/orders/{oid}/refresh-draft').json()
    assert fresh['id'] == oid
    assert fresh['totalRial'] > old['totalRial']
    assert fresh['lines'][0]['unitPriceRial'] == round(cart.json()[0]['product']['price'] * 600000)
    assert fresh['priceRevision'] != old['priceRevision']
    assert client.get(f'/api/admin/orders/{oid}').json()['totalRial'] == fresh['totalRial']
    # Another tab holding the old quote must not confirm a silently higher amount.
    assert write(client, 'POST', f'/api/account/orders/{oid}/submit', json={'priceRevision': old['priceRevision']}).status_code == 409
    with Session(engine) as db:
        assert db.get(Product, 'phone-01').stock == 100
        assert db.get(Order, oid).status == 'draft'
    response = write(client, 'POST', f'/api/account/orders/{oid}/submit', json={'priceRevision': fresh['priceRevision']})
    assert response.status_code == 200, response.text
    assert client.get('/api/account/cart').json() == []
    increase(client)
    # Once reserved/submitted the invoice is historical; repricing cannot rewrite it.
    assert write(client, 'POST', f'/api/account/orders/{oid}/refresh-draft').json()['totalRial'] == fresh['totalRial']


def test_new_invoice_uses_latest_price_and_refresh_download_agree(client, engine):
    register(client)
    grant(engine)
    oid, old = cart_and_draft(client)
    increase(client)
    fresh = write(client, 'POST', f'/api/account/orders/{oid}/refresh-draft').json()
    new_id = write(client, 'POST', '/api/account/invoices', json=CHECKOUT).json()['id']
    newest = client.get(f'/api/account/orders/{new_id}').json()
    assert newest['totalRial'] == fresh['totalRial'] > old['totalRial']
    # JSON and downloadable documents read the same persisted lines and total.
    html = client.get(f'/api/account/orders/{oid}/invoice').text
    assert str(oid) in html
    assert client.get(f'/api/account/orders/{oid}').json()['lines'] == fresh['lines']
    with Session(engine) as db:
        row = db.get(Order, oid)
        assert row.lines[0].unit_price == Decimal(str(fresh['lines'][0]['unitPrice']))


def test_refresh_quote_requires_csrf_and_ownership(client, app, engine):
    register(client)
    oid, _ = cart_and_draft(client)
    assert client.post(f'/api/account/orders/{oid}/refresh-draft').status_code == 400
    with TestClient(app, base_url='https://testserver') as other:
        assert write(other, 'POST', f'/api/account/orders/{oid}/refresh-draft').status_code == 401
        register(other, 'other@example.com')
        assert write(other, 'POST', f'/api/account/orders/{oid}/refresh-draft').status_code == 404
    with Session(engine) as db, db.begin():
        db.get(Order, oid).created_at = utcnow() - timedelta(days=2)
    assert write(client, 'POST', f'/api/account/orders/{oid}/refresh-draft').status_code == 409


def test_refresh_rejects_changed_cart_and_unavailable_product(client, engine):
    register(client)
    oid, _ = cart_and_draft(client)
    write(client, 'PUT', '/api/account/cart/phone-01', json={'quantity': 1})
    assert write(client, 'POST', f'/api/account/orders/{oid}/refresh-draft').status_code == 409
    write(client, 'PUT', '/api/account/cart/phone-01', json={'quantity': 2})
    with Session(engine) as db, db.begin():
        db.get(Product, 'phone-01').is_active = False
    assert write(client, 'POST', f'/api/account/orders/{oid}/refresh-draft').status_code == 409


def test_admin_search_supports_persian_digits_brand_and_archived_products(client, engine):
    register(client)
    assert client.get('/api/admin/products?q=Apple&size=6').status_code == 403
    grant(engine)
    for term in ['iPhone 15', 'iPhone ۱۵', 'آیفون ۱۵', 'ايفون ١٥', 'phone-01']:
        result = client.get('/api/admin/products', params={'q': term, 'size': 6})
        assert result.status_code == 200
        assert 'phone-01' in {p['id'] for p in result.json()['items']}, term
    assert all(p['brand'] == 'Apple' for p in client.get('/api/admin/products?q=Apple&size=6').json()['items'])
    with Session(engine) as db, db.begin():
        db.get(Product, 'phone-01').is_active = False
    assert client.get('/api/admin/products?q=phone-01').json()['items'][0]['isActive'] is False
    assert client.get('/api/admin/products', params={'q': '%_%'}).json()['total'] == 0
