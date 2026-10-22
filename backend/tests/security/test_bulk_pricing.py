from decimal import Decimal

import pytest
from conftest import CHECKOUT, register, write
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.errors import BusinessError
from app.infrastructure.management import ManagementRepository
from app.infrastructure.models import AuditLog, OrderLine, Product, Role, RolePermission, User, UserRole

PATH = '/api/admin/products/pricing'
BODY = {'category': 'smartphones', 'brand': 'Apple', 'percent': '15'}


def grant(engine, writable=True):
    with Session(engine) as db, db.begin():
        uid = db.scalar(select(User.id).where(User.email == 'user@example.com'))
        db.add(Role(name='pricing-admin'))
        db.flush()
        db.add_all(RolePermission(role='pricing-admin', permission=p) for p in
                   ['admin:access', 'products:read'] + (['products:write'] if writable else []))
        db.add(UserRole(user_id=uid, role='pricing-admin'))


def preview(client, body=BODY):
    result = write(client, 'POST', PATH, json=body)
    assert result.status_code == 200, result.text
    return result.json()


def apply(client, data, body=BODY):
    return write(client, 'POST', PATH, json={**body, 'snapshot': data['snapshot']})


def test_auth_permissions_csrf_and_brand_listing(client, engine):
    assert write(client, 'POST', PATH, json=BODY).status_code == 401
    register(client)
    assert write(client, 'POST', PATH, json=BODY).status_code == 403
    grant(engine, writable=False)
    assert write(client, 'POST', PATH, json=BODY).status_code == 403
    assert client.get(PATH+'/brands?category=smartphones').status_code == 403


def test_increase_fifteen_percent_category_brand_all_pages_and_preserve_order(client, engine):
    register(client)
    grant(engine)
    assert client.post(PATH, json=BODY).status_code == 400
    assert 'Apple' in client.get(PATH+'/brands?category=smartphones').json()['items']
    write(client, 'PUT', '/api/account/cart/phone-01', json={'quantity': 1})
    order = write(client, 'POST', '/api/account/orders', json=CHECKOUT).json()
    with Session(engine) as db:
        before = {p.id: (p.price, p.stock) for p in db.scalars(select(Product))}
        line_price = db.scalar(select(OrderLine.unit_price).where(OrderLine.order_id == order['id']))
    data = preview(client)
    assert data['items'] and not data['applied']
    assert all(p['brand'] == 'Apple' for p in data['items'])
    with Session(engine) as db:
        assert db.get(Product, 'phone-01').price == before['phone-01'][0]
    response = apply(client, data)
    assert response.status_code == 200, response.text
    assert response.json()['applied']
    ids = {p['id'] for p in data['items']}
    with Session(engine) as db:
        for item in data['items']:
            assert item['newPriceRial'] == int(Decimal(item['oldPriceRial'])*Decimal('1.15')+Decimal('.5'))
            assert round(db.get(Product, item['id']).price*600000) == item['newPriceRial']
        for p in db.scalars(select(Product)):
            assert p.stock == before[p.id][1]
            if p.id not in ids:
                assert p.price == before[p.id][0]
        assert db.scalar(select(OrderLine.unit_price).where(OrderLine.order_id == order['id'])) == line_price
        assert len(list(db.scalars(select(AuditLog).where(AuditLog.event == 'PRODUCT_PRICE_CHANGED')))) == data['changed']
    assert apply(client, data).status_code == 409  # Retrying cannot compound the increase.
    public = client.get('/api/products/phone-01').json()
    assert round(public['price']*600000) == next(i['newPriceRial'] for i in data['items'] if i['id']=='phone-01')


def test_membership_or_price_change_invalidates_preview(client, engine):
    register(client)
    grant(engine)
    data = preview(client)
    with Session(engine) as db, db.begin():
        db.get(Product, data['items'][0]['id']).price += 1
    assert apply(client, data).status_code == 409
    data = preview(client)
    with Session(engine) as db, db.begin():
        p = db.get(Product, data['items'][0]['id'])
        p.payload = {**p.payload, 'brand': 'Changed brand'}
    assert apply(client, data).status_code == 409
    assert apply(client, preview(client), {**BODY, 'percent': '20'}).status_code == 409


def test_all_brands_includes_archived_and_empty_match(client, engine):
    register(client)
    grant(engine)
    with Session(engine) as db, db.begin():
        db.get(Product, 'phone-01').is_active = False
    data = preview(client, {**BODY, 'brand': None})
    assert {'Apple', 'Samsung'}.issubset({p['brand'] for p in data['items']})
    assert next(p for p in data['items'] if p['id']=='phone-01')['isActive'] is False
    assert preview(client, {**BODY, 'brand': 'No such brand'})['total'] == 0


def test_updates_every_matching_product_not_only_first_admin_page(client, engine):
    register(client)
    grant(engine)
    with Session(engine) as db, db.begin():
        db.add_all(Product(id=f'bulk-test-{i}', name=f'Test {i}', name_en=f'Test {i}',
                           category='laptops', price=100, stock=0, is_active=False,
                           payload={'brand': 'Bulk Test', 'price': 100}) for i in range(35))
    body = {'category': 'laptops', 'brand': 'Bulk Test', 'percent': '15'}
    data = preview(client, body)
    assert data['total'] == 35
    assert apply(client, data, body).json()['changed'] == 35
    with Session(engine) as db:
        rows = list(db.scalars(select(Product).where(Product.id.like('bulk-test-%'))))
        assert len(rows) == 35
        assert all(p.price == 115 and p.stock == 0 and not p.is_active for p in rows)


@pytest.mark.parametrize('patch', [{'percent': '0'}, {'percent': '-15'}, {'percent': '100.01'},
                                 {'percent': 'NaN'}, {'percent': '15.123'}, {'category': 'unknown'},
                                 {'snapshot': 'forged'}, {'price': 1}])
def test_rejects_invalid_input(client, engine, patch):
    register(client)
    grant(engine)
    assert write(client, 'POST', PATH, json={**BODY, **patch}).status_code == 400


def test_atomic_rollback_after_one_product_updated(client, engine, monkeypatch):
    register(client)
    grant(engine)
    data = preview(client)
    first, second = data['items'][:2]
    original = ManagementRepository.set_product_price

    def fail(self, pid, expected, price):
        if pid == second['id']:
            raise BusinessError(409, 'Concurrent write')
        return original(self, pid, expected, price)

    monkeypatch.setattr(ManagementRepository, 'set_product_price', fail)
    assert apply(client, data).status_code == 409
    with Session(engine) as db:
        assert round(db.get(Product, first['id']).price*600000) == first['oldPriceRial']
        assert db.scalar(select(AuditLog).where(AuditLog.event == 'PRODUCT_PRICE_CHANGED')) is None


def test_rounding_price_ceiling_and_rate_limit(client, engine, app):
    register(client)
    grant(engine)
    with Session(engine) as db, db.begin():
        db.get(Product, 'phone-01').price = Decimal(10)/600000
    data = preview(client)
    assert next(p for p in data['items'] if p['id']=='phone-01')['newPriceRial'] == 12
    with Session(engine) as db, db.begin():
        db.get(Product, 'phone-01').price = 1000000
    assert write(client, 'POST', PATH, json=BODY).status_code == 400
    app.state.settings.email_account_limit = 1
    assert write(client, 'POST', PATH, json=BODY).status_code == 429
