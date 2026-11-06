"""Persian, self-contained PDF. Persist once and reuse the exact bytes."""

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

FONT = "NexoraVazirmatn"
LOCK = Lock()


def visual(value):
    return get_display(arabic_reshaper.reshape(str(value)))


def render_invoice(data):
    # ReportLab's dynamic TrueType font state is shared; serialize PDF generation.
    with LOCK:
        return _render_invoice(data)


def _render_invoice(data):
    if FONT not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(
            TTFont(FONT, str(Path(__file__).resolve().parents[1] / "assets/fonts/Vazirmatn-Regular.ttf"))
        )
    stream = BytesIO()
    canvas = Canvas(stream, pagesize=A4)
    canvas.setTitle("Nexora Invoice " + data["trackingCode"])
    canvas.setAuthor("Nexora")
    width, height = A4
    y = height - 95
    page = 0
    blue = HexColor("#1d4ed8")
    ink = HexColor("#17243b")
    soft = HexColor("#eff4ff")

    def text(value, x, at, size=10, max_width=None):
        shaped = visual(value)
        if max_width:
            while size > 6 and pdfmetrics.stringWidth(shaped, FONT, size) > max_width:
                size -= 0.5
        canvas.setFont(FONT, size)
        canvas.drawRightString(x, at, shaped)

    def wrap(value, size=10, max_width=515):
        rows = []
        for line in str(value).replace("\r", "").split("\n"):
            current = ""
            for char in line:
                if current and pdfmetrics.stringWidth(visual(current + char), FONT, size) > max_width:
                    rows.append(current)
                    current = char
                else:
                    current += char
            rows.append(current)
        return rows

    def footer():
        canvas.setStrokeColor(HexColor("#dce4ef"))
        canvas.line(40, 49, width - 40, 49)
        canvas.setFillColor(HexColor("#64748b"))
        text(data.get("footer", "تأیید سفارش به معنی تأیید پرداخت نیست."), width - 40, 32, 8)
        canvas.drawString(40, 32, str(page))
        canvas.setFillColor(ink)

    def header():
        nonlocal y, page
        page += 1
        canvas.setFillColor(blue)
        canvas.rect(0, height - 12, width, 12, fill=1, stroke=0)
        canvas.setFont(FONT, 21)
        canvas.drawString(40, height - 53, "NEXORA")
        text(data.get("title", "فاکتور سفارش عمده"), width - 40, height - 50, 13)
        canvas.setFillColor(ink)
        y = height - 90
        text(data.get("identifierLabel", "کد رهگیری") + ": " + data["trackingCode"], width - 40, y, 12)
        stamp = (
            datetime.fromisoformat(data["approvedAt"])
            .astimezone(ZoneInfo("Asia/Tehran"))
            .strftime("%Y/%m/%d %H:%M")
        )
        text("تاریخ: " + stamp, 235, y, 9)
        y -= 28

    def new_page():
        footer()
        canvas.showPage()
        header()

    def paragraph(value, size=10):
        nonlocal y
        for line in wrap(value, size, width - 80):
            if y < 75:
                new_page()
            text(line, width - 40, y, size)
            y -= size * 1.8

    header()
    customer = data["customer"]
    customer_lines = []
    for key, label in [
        ("name", "خریدار"),
        ("company", "شرکت / فروشگاه"),
        ("phone", "تلفن"),
        ("city", "شهر"),
        ("address", "نشانی"),
        ("postalCode", "کد پستی"),
        ("email", "ایمیل"),
    ]:
        customer_lines.extend(wrap(label + ": " + str(customer.get(key) or "—"), 10, width - 110))
    panel_height = len(customer_lines) * 18 + 25
    canvas.setFillColor(soft)
    canvas.roundRect(35, y - panel_height + 12, width - 70, panel_height, 10, fill=1, stroke=0)
    canvas.setFillColor(ink)
    y -= 6
    for line in customer_lines:
        text(line, width - 50, y)
        y -= 18
    y -= 26

    def table_header():
        nonlocal y
        canvas.setFillColor(blue)
        canvas.roundRect(35, y - 12, width - 70, 28, 5, fill=1, stroke=0)
        canvas.setFillColor(HexColor("#ffffff"))
        for label, x in [("شرح کالا", width - 45), ("تعداد", 335), ("فی (ریال)", 275), ("مبلغ (ریال)", 150)]:
            text(label, x, y, 9)
        canvas.setFillColor(ink)
        y -= 28

    if y < 130:
        new_page()
    table_header()
    for index, line in enumerate(data["lines"], 1):
        names = wrap(str(index) + " — " + line["name"], 10, 205)
        row_height = max(34, len(names) * 18 + 12)
        if y - row_height < 80:
            new_page()
            table_header()
        if index % 2:
            canvas.setFillColor(HexColor("#f7f9fc"))
            canvas.rect(35, y - row_height + 12, width - 70, row_height, fill=1, stroke=0)
        canvas.setFillColor(ink)
        for offset, name in enumerate(names):
            text(name, width - 45, y - offset * 18, 10)
        text(str(line["quantity"]), 335, y, 9, 45)
        text(format(int(line["unitPriceRial"]), ","), 275, y, 9, 105)
        text(format(int(line["totalRial"]), ","), 150, y, 9, 110)
        y -= row_height
        canvas.setStrokeColor(HexColor("#dce4ef"))
        canvas.line(35, y + 12, width - 35, y + 12)
    y -= 20
    if y < 200:
        new_page()
    canvas.setFillColor(soft)
    canvas.roundRect(width - 325, y - 91, 290, 110, 10, fill=1, stroke=0)
    canvas.setFillColor(ink)
    paragraph("جمع اقلام: " + format(int(data["subtotalRial"]), ",") + " ریال", 10)
    paragraph(data.get("shippingLabel", "هزینه ارسال توافقی") + ": " + format(int(data["shippingRial"]), ",") + " ریال", 10)
    canvas.setFillColor(blue)
    paragraph("مبلغ کل: " + format(int(data["totalRial"]), ",") + " ریال", 14)
    canvas.setFillColor(ink)
    y -= 37
    if data.get("terms"):
        paragraph("توضیحات فاکتور: " + data["terms"], 9)
    paragraph(
        data.get("notice", "این سند با اطلاعات مشتری و قیمت توافقی تأییدشدهٔ فروشگاه صادر شده است. مبلغی در بات دریافت نشده است."),
        8,
    )
    footer()
    canvas.save()
    return stream.getvalue()
