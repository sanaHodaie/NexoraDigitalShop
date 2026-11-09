"""Persian self-contained invoice. Persist once and reuse the exact bytes."""
from datetime import datetime
from io import BytesIO
from pathlib import Path
from threading import Lock
from zoneinfo import ZoneInfo

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas

FONT = 'NexoraVazirmatn'
LOCK = Lock()
SHIPPING_NOTE = 'روش و زمان ارسال پس از هماهنگی با خریدار تعیین می‌شود. پیش از ارسال، نشانی و شماره تماس تأیید شود؛ هزینه ارسال مطابق مبلغ درج‌شده در همین فاکتور است.'
WARRANTY_NOTE = 'گارانتی هر کالا مطابق مشخصات و شرایط اعلام‌شده برای همان کالا است. نام شرکت گارانتی و مدت پوشش پیش از تحویل بررسی شود؛ برای پیگیری، فاکتور و شناسه کالا را نگه دارید.'


def visual(value):
    return get_display(arabic_reshaper.reshape(str(value)))


def render_invoice(data):
    with LOCK:
        return _render_invoice(data)


def _render_invoice(data):
    if FONT not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(FONT, str(Path(__file__).resolve().parents[1] / 'assets/fonts/Vazirmatn-Regular.ttf')))
    stream = BytesIO()
    canvas = Canvas(stream, pagesize=A4)
    canvas.setTitle('Nexora Invoice ' + data['trackingCode'])
    canvas.setAuthor('Nexora')
    width, height = A4
    left, right = 36, width - 36
    cw = right - left
    blue, ink, muted = HexColor('#2856CB'), HexColor('#172D50'), HexColor('#607491')
    soft, line_color = HexColor('#F0F5FF'), HexColor('#DCE6F5')
    y, page = height, 0

    def text(value, x, at, size=10, max_width=None):
        shaped = visual(value)
        if max_width:
            while size > 6 and pdfmetrics.stringWidth(shaped, FONT, size) > max_width:
                size -= .5
        canvas.setFont(FONT, size)
        canvas.drawRightString(x, at, shaped)

    def wrap(value, size=9, max_width=cw):
        rows = []
        for original in str(value).replace('\r', '').split('\n'):
            current = ''
            for char in original:
                if current and pdfmetrics.stringWidth(visual(current + char), FONT, size) > max_width:
                    rows.append(current)
                    current = char
                else:
                    current += char
            rows.append(current)
        return rows

    def footer():
        canvas.setStrokeColor(line_color)
        canvas.line(left, 46, right, 46)
        canvas.setFillColor(muted)
        text(data.get('footer', 'تأیید سفارش به معنی تأیید پرداخت نیست.'), right, 30, 8, cw - 65)
        canvas.setFont(FONT, 8)
        canvas.drawString(left, 30, f'NEXORA  /  {page}')

    def header():
        nonlocal y, page
        page += 1
        canvas.setFillColor(HexColor('#FAFCFF'))
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        for index in range(60):
            canvas.setFillColor(HexColor('#%02x%02x%02x' % (40 + index // 3, 100 - index // 2, 218)))
            canvas.rect(index * width / 60, height - 7, width / 60 + 1, 7, fill=1, stroke=0)
        canvas.setFillColor(blue)
        canvas.roundRect(left, height - 68, 40, 40, 12, fill=1, stroke=0)
        canvas.setFillColor(HexColor('#FFFFFF'))
        canvas.setFont(FONT, 24)
        canvas.drawCentredString(left + 20, height - 57, 'N')
        canvas.setFillColor(ink)
        canvas.setFont(FONT, 16)
        canvas.drawString(left + 50, height - 46, 'NEXORA')
        canvas.setFillColor(muted)
        canvas.setFont(FONT, 7)
        canvas.drawString(left + 50, height - 61, 'DIGITAL SHOP  /  INVOICE')
        canvas.setFillColor(ink)
        text(data.get('title', 'فاکتور سفارش عمده'), right, height - 45, 16, 285)
        canvas.setFillColor(muted)
        text('جزئیات سفارش و قیمت‌های تأییدشده', right, height - 64, 8)
        canvas.setFillColor(soft)
        canvas.roundRect(left, height - 115, cw, 32, 9, fill=1, stroke=0)
        canvas.setFillColor(blue)
        text(data.get('identifierLabel', 'کد رهگیری') + ': ' + data['trackingCode'], right - 12, height - 103, 11)
        stamp = datetime.fromisoformat(data['approvedAt']).astimezone(ZoneInfo('Asia/Tehran')).strftime('%Y/%m/%d  %H:%M')
        canvas.setFillColor(muted)
        text('تاریخ صدور: ' + stamp, left + 214, height - 103, 8)
        y = height - 143

    def new_page():
        footer()
        canvas.showPage()
        header()

    def ensure(space):
        if y - space < 67:
            new_page()

    def paragraph(value, size=9, color=ink):
        nonlocal y
        for row in wrap(value, size):
            ensure(size * 1.85)
            canvas.setFillColor(color)
            text(row, right, y, size)
            y -= size * 1.85

    header()
    canvas.setFillColor(blue)
    text('مشخصات خریدار و نشانی تحویل', right, y, 11)
    y -= 22
    customer = data['customer']
    def customer_row(fields):
        nonlocal y
        active = [(key, label) for key, label in fields if customer.get(key) or key in ('name', 'phone', 'address')]
        if not active:
            return
        columns = len(active)
        cell_width = cw / columns
        wrapped = [wrap(label + ': ' + str(customer.get(key) or '—'), 9, cell_width - 24) for key, label in active]
        row_height = max(len(rows) for rows in wrapped) * 15 + 10
        ensure(row_height + 5)
        canvas.setFillColor(soft)
        canvas.roundRect(left, y - row_height + 14, cw, row_height, 8, fill=1, stroke=0)
        canvas.setFillColor(ink)
        for index, rows in enumerate(wrapped):
            for offset, row in enumerate(rows):
                text(row, right - index * cell_width - 12, y - offset * 15, 9)
        y -= row_height + 5

    customer_row([('name', 'خریدار'), ('company', 'شرکت / فروشگاه')])
    customer_row([('phone', 'شماره تماس'), ('city', 'شهر')])
    customer_row([('address', 'نشانی تحویل')])
    customer_row([('postalCode', 'کد پستی'), ('email', 'ایمیل')])
    y -= 22

    def table_header():
        nonlocal y
        ensure(60)
        canvas.setFillColor(blue)
        canvas.roundRect(left, y - 10, cw, 28, 7, fill=1, stroke=0)
        canvas.setFillColor(HexColor('#FFFFFF'))
        for label, x in [('شرح کالا', right - 10), ('تعداد', 329), ('قیمت واحد / ریال', 278), ('جمع / ریال', 151)]:
            text(label, x, y, 8)
        y -= 30

    table_header()
    for index, item in enumerate(data['lines'], 1):
        names = wrap(str(index) + '  ·  ' + item['name'], 9, 200)
        row_height = max(34, len(names) * 16 + 10)
        if y - row_height < 70:
            new_page()
            table_header()
        canvas.setFillColor(HexColor('#FFFFFF') if index % 2 else soft)
        canvas.roundRect(left, y - row_height + 12, cw, row_height, 5, fill=1, stroke=0)
        canvas.setFillColor(ink)
        for offset, name in enumerate(names):
            text(name, right - 10, y - offset * 16, 9)
        text(str(item['quantity']), 329, y, 9, 43)
        text(format(int(item['unitPriceRial']), ','), 278, y, 9, 108)
        text(format(int(item['totalRial']), ','), 151, y, 9, 105)
        y -= row_height
        canvas.setStrokeColor(line_color)
        canvas.line(left, y + 12, right, y + 12)
    y -= 22
    ensure(104)
    canvas.setFillColor(soft)
    canvas.roundRect(right - 275, y - 70, 275, 91, 12, fill=1, stroke=0)
    canvas.setFillColor(ink)
    text('جمع اقلام: ' + format(int(data['subtotalRial']), ',') + ' ریال', right - 14, y, 10)
    text(data.get('shippingLabel', 'هزینه ارسال توافقی') + ': ' + format(int(data['shippingRial']), ',') + ' ریال', right - 14, y - 23, 9)
    canvas.setFillColor(blue)
    text('مبلغ کل: ' + format(int(data['totalRial']), ',') + ' ریال', right - 14, y - 50, 13, 248)
    y -= 94
    if data.get('terms'):
        paragraph('توضیحات توافق‌شده: ' + data['terms'])
        y -= 9
    paragraph(data.get('notice', 'این سند با اطلاعات مشتری و قیمت توافقی تأییدشده صادر شده است. مبلغی در بات دریافت نشده است.'), 8, muted)
    y -= 12
    shipping = wrap(SHIPPING_NOTE, 8, cw - 24)
    warranty = wrap(WARRANTY_NOTE, 8, cw - 24)
    note_height = 44 + (len(shipping) + len(warranty)) * 14
    ensure(note_height + 90)
    canvas.setFillColor(soft)
    canvas.roundRect(left, y - note_height, cw, note_height + 12, 10, fill=1, stroke=0)
    canvas.setFillColor(blue)
    text('راهنمای ارسال و گارانتی', right - 12, y - 3, 10)
    at = y - 24
    canvas.setFillColor(muted)
    for row in shipping + [''] + warranty:
        text(row, right - 12, at, 8)
        at -= 14
    # Bottom-left on the last page, blank for an actual management stamp/signature.
    canvas.setStrokeColor(line_color)
    canvas.setFillColor(HexColor('#FFFFFF'))
    canvas.roundRect(left, 65, 210, 82, 10, fill=1, stroke=1)
    canvas.setFillColor(blue)
    text('مهر و امضای مدیریت', left + 196, 125, 10)
    canvas.setDash(2, 3)
    canvas.line(left + 16, 87, left + 194, 87)
    canvas.setDash()
    canvas.setFillColor(muted)
    text('تأیید نهایی فروشگاه', left + 196, 72, 7)
    footer()
    canvas.save()
    return stream.getvalue()
