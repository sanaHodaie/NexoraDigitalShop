"""Paginated read-only view of site orders and approved Telegram invoices.

Never copy a Telegram quote into stock/payment orders or load stored PDF blobs.
"""
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import String, cast, func, literal, or_, select, union_all
from sqlalchemy.orm import Session, defer

from app.domain.entities import aware
from app.infrastructure import models as m
from app.infrastructure.management import search_column, search_text


def listing(engine, page, size, query='', source='all'):
    site = select(literal('site').label('source'), m.Order.id.label('id'),
                  m.Order.created_at.label('registered_at')).join(m.User)
    telegram = select(literal('telegram').label('source'), m.CustomerRequest.id.label('id'),
                      m.CustomerRequest.approved_at.label('registered_at')).where(
                          m.CustomerRequest.kind == 'wholesale', m.CustomerRequest.approved_at.is_not(None))
    if query:
        for token in search_text(query).split()[:12]:
            site = site.where(or_(
                search_column(func.coalesce(m.Order.customer_email, m.User.email)).contains(token, autoescape=True),
                search_column(m.User.full_name).contains(token, autoescape=True),
                search_column(m.Order.shipping_address['recipient'].as_string()).contains(token, autoescape=True),
                cast(m.Order.id, String).contains(token, autoescape=True)))
            telegram = telegram.where(or_(
                search_column(m.CustomerRequest.details['name'].as_string()).contains(token, autoescape=True),
                search_column(m.CustomerRequest.details['phone'].as_string()).contains(token, autoescape=True),
                search_column(m.CustomerRequest.details['items'].as_string()).contains(token, autoescape=True),
                m.CustomerRequest.tracking_code.contains(token, autoescape=True),
                cast(m.CustomerRequest.id, String).contains(token, autoescape=True)))
    feed = (site if source == 'site' else telegram if source == 'telegram' else union_all(site, telegram)).subquery()
    with Session(engine) as db:
        total = db.scalar(select(func.count()).select_from(feed))
        rows = db.execute(select(feed).order_by(feed.c.registered_at.desc(), feed.c.source, feed.c.id.desc())
                          .offset((page - 1) * size).limit(size)).all()
        site_ids = [r.id for r in rows if r.source == 'site']
        telegram_ids = [r.id for r in rows if r.source == 'telegram']
        orders = {o.id: (o, u) for o, u in db.execute(
            select(m.Order, m.User).join(m.User).where(m.Order.id.in_(site_ids)))} if site_ids else {}
        requests = {r.id: r for r in db.scalars(select(m.CustomerRequest)
                    .options(defer(m.CustomerRequest.invoice_pdf)).where(m.CustomerRequest.id.in_(telegram_ids)))} if telegram_ids else {}
        items = []
        for entry in rows:
            if entry.source == 'site':
                row, user = orders[entry.id]
                items.append({'source': 'site', 'id': row.id, 'status': row.status,
                              'name': (row.shipping_address or {}).get('recipient') or user.full_name,
                              'email': row.customer_email or user.email, 'createdAt': aware(row.created_at),
                              'totalRial': str(int((Decimal(row.total) * row.rial_rate).quantize(Decimal('1'), rounding=ROUND_HALF_UP)))})
            else:
                row = requests[entry.id]
                items.append({'source': 'telegram', 'id': row.id, 'status': row.status,
                              'name': row.details.get('name') or '', 'phone': row.details.get('phone') or '',
                              'trackingCode': row.tracking_code, 'createdAt': aware(row.approved_at),
                              'totalRial': str((row.invoice_data or {}).get('totalRial') or '0')})
        return {'items': items, 'total': total, 'page': page, 'pageSize': size}
