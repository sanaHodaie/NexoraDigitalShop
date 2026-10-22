"""Self-contained UTF-8 documents; escape all customer/catalog fields, no scripts or remote assets."""

from html import escape
from zoneinfo import ZoneInfo

from fastapi.responses import HTMLResponse

from app.domain.invoices import invoice_data

LABELS = {
    "draft": "در صف پرداخت · پیش‌فاکتور ثبت‌نشده",
    "pending": "در صف پرداخت",
    "pending_payment": "در صف پرداخت",
    "paid": "پرداخت شده",
    "expired": "منقضی شده",
    "cancelled": "لغو شده",
}

DOCUMENT_STYLES = """
*{box-sizing:border-box}body{margin:0;background:#edf1f6;color:#17243b;font:13px/1.9 Tahoma,Arial,sans-serif;font-variant-numeric:tabular-nums}
main{max-width:980px;margin:32px auto;background:#fff;border:1px solid #dce4ef;border-radius:4px;box-shadow:0 12px 48px #142c4d12;overflow:hidden}
p{margin:6px 0}h1,h2{margin:0}h2{font-size:14px}small{display:block;color:#64748b;font-size:10px}
.masthead{padding:32px 40px 0;background:white;color:#17243b;border-top:6px solid #2563eb}
.brand-row,.title-row,.meta,.totals p,.section-title{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:12px;letter-spacing:3px;font-size:20px}
.brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#2563eb;color:white;font-size:24px;letter-spacing:0}
.brand small{color:#64748b;letter-spacing:0;font-weight:normal}.title-row{margin:30px 0 24px;align-items:end}
h1{font-size:30px;line-height:1.7;letter-spacing:-.5px}.eyebrow,.number span,.meta span{color:#64748b;font-size:11px}
.number{text-align:left;padding-right:24px;border-right:3px solid #2563eb}.number span,.number b{display:block}.number b{font-size:30px;direction:ltr;color:#2563eb}
.status{color:#1e40af;background:#dbeafe;font-weight:bold;font-size:11px;border-radius:30px;padding:6px 14px}
.status.paid{color:#166534;background:#dcfce7}.status.cancelled,.status.expired{color:#991b1b;background:#fee2e2}
.meta{justify-content:flex-start;gap:16px 40px;padding:12px 18px;border:1px solid #dce4ef;border-radius:8px;background:#f7f9fc;font-size:12px}
.meta p{margin:0}.meta span{display:block;font-size:10px;margin-bottom:3px}.content{padding:28px 40px}.recipient{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding-bottom:22px;border-bottom:1px solid #dce4ef;overflow-wrap:anywhere}
.recipient section+section{border-right:1px solid #dce4ef;padding-right:24px}.recipient h2{margin-bottom:10px;color:#2563eb}
.recipient .person{font-size:17px;font-weight:bold}.label{color:#64748b;font-size:11px;margin-left:6px}
.section-title{margin:24px 0 12px}.section-title span{font-size:10px;color:#64748b}.section-index{display:inline-block;font-size:10px;color:#2563eb;border:1px solid #cbdcf5;padding:1px 7px;border-radius:5px;margin-left:7px;vertical-align:middle}
table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}td,th{padding:14px 10px;text-align:right;border-bottom:1px solid #dce4ef;overflow-wrap:anywhere;vertical-align:top}
th{background:#eff4fb;color:#17243b;font-size:10px;font-weight:bold;border-top:2px solid #2563eb;border-bottom:1px solid #adc4e8}th:first-child{width:7%}th:nth-child(2){width:37%}th:nth-child(3){width:10%}
th:nth-child(4),th:nth-child(5){width:23%}tbody tr:nth-child(even){background:#f8fafc}td:last-child{font-weight:bold;color:#2563eb}
.summary{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start;margin-top:24px}.notes{color:#64748b;font-size:11px;line-height:2.1}
.notes h2{color:#17243b;margin-bottom:10px}.free{color:#15803d;font-weight:bold}.totals{border:1px solid #dce4ef;background:#f7f9fc;border-radius:14px;padding:8px 18px 0}
.totals p{padding:8px 0;font-size:12px;margin:0;align-items:baseline}.totals p>span{color:#64748b}
.totals .grand{padding:16px 0;margin-top:6px;border-top:2px solid #2563eb}.grand b{font-size:22px;color:#1d4ed8}.grand small{display:inline;font-size:10px;color:inherit;font-weight:normal}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:28px}.signatures div{display:flex;flex-direction:column;align-items:center;border:1px solid #dce4ef;border-radius:8px;padding:14px;min-height:145px;font-size:12px}.signatures small{margin:6px 0 auto;color:#64748b}.signatures span{font-size:10px;color:#526079;align-self:stretch;border-top:1px dotted #cbd5e1;padding-top:7px}.signature-label{font-weight:bold;letter-spacing:0}
.footer{display:flex;gap:20px;align-items:center;border-top:1px solid #dce4ef;margin-top:24px;padding-top:14px;color:#64748b}.footer b{font-size:12px;letter-spacing:2px}.hint{font-size:10px;color:#64748b}
.warranty{padding:16px;border:1px solid #dce4ef;border-radius:12px;margin:14px 0;overflow-wrap:anywhere}.warranty-title{margin-top:28px}ul{padding-right:20px;font-size:12px}
.warranty,tr,.signatures,.summary,.recipient,.meta,.footer{break-inside:avoid}h2,.section-title{break-after:avoid}p{orphans:3;widows:3}@page{size:A4;margin:14mm 13mm}
@media(max-width:600px){main{margin:0;border-radius:0}.masthead{padding:20px 16px 0}.content{padding:22px 16px}.recipient,.summary{grid-template-columns:1fr;gap:18px}.recipient section+section{border:0;border-top:1px dashed #dce4ef;padding:16px 0 0}.totals{grid-row:1}table{font-size:10px}td,th{padding:9px 4px}h1{font-size:23px}.footer{align-items:start;flex-direction:column;gap:6px}.signatures{gap:10px}}
@media print{
 body{background:white;font-size:9pt;line-height:1.8;color:#17243b}
 main{margin:0;border:0;max-width:none;border-radius:0;overflow:visible;box-shadow:none}
 .masthead{padding:5mm 0 0;border-top:1.2mm solid #2563eb;break-inside:avoid}
 .brand{font-size:17pt}.brand-mark{background:white;color:#2563eb;border:1px solid #2563eb;width:10mm;height:10mm}
 .brand small,.eyebrow,.number span,.meta span{color:#526079}.status{background:white!important;border:1px solid currentColor;font-size:8pt}
 .title-row{margin:5mm 0}h1{font-size:22pt}.number b{font-size:24pt}.number{border-right-width:.7mm}
 .meta{padding:3mm 4mm;background:white;font-size:8pt}.meta span{font-size:7pt}
 .content{padding:6mm 0 0}.recipient,.summary{grid-template-columns:1fr 1fr;gap:6mm}
 .recipient{padding-bottom:5mm}.recipient section+section{border:0;border-right:1px solid #dce4ef;padding:0 6mm 0 0}
 .recipient h2,h2{font-size:10pt}.recipient .person{font-size:12pt}.section-title{margin:6mm 0 3mm}
 .totals{grid-row:auto;background:white;border-radius:2mm;padding:2mm 4mm 0}.totals p{font-size:9pt;padding:2mm 0}.grand b{font-size:16pt}
 table{font-size:9pt}td,th{padding:3mm 2mm}th{font-size:8pt}thead{display:table-header-group}tbody tr{break-inside:avoid;page-break-inside:avoid}
 .summary{margin-top:6mm}.notes{font-size:8pt}.signatures{grid-template-columns:1fr 1fr;gap:6mm;margin-top:7mm}.signatures div{min-height:32mm;padding:3mm}
 .footer{flex-direction:row;gap:5mm;margin-top:6mm;padding-top:3mm}.hint{font-size:7pt}.screen-only{display:none}
}
"""


def document_response(order, warranty=False, download=True):
    data = invoice_data(order)

    def safe(value):
        return escape(str(value or "ثبت نشده"))

    def number(value):
        return str(value).translate(str.maketrans("0123456789,", "۰۱۲۳۴۵۶۷۸۹٬"))

    def money(value):
        return f"{number(f'{value:,}')} ریال"

    title = (
        "کارت گارانتی — فرم تکمیل توسط فروشنده"
        if warranty
        else ("پیش‌فاکتور فروش" if order.status == "draft" else "فاکتور فروش")
    )
    addr = data["shippingAddress"] or {}
    rows = "".join(
        f"<tr><td>{number(i)}</td><td><b>{safe(x['name'])}</b><small>شناسهٔ کالا: <bdi>{safe(x['productId'])}</bdi></small></td>"
        f"<td>{number(x['quantity'])}</td><td>{money(x['unitPriceRial'])}</td><td>{money(x['totalRial'])}</td></tr>"
        for i, x in enumerate(data["lines"], 1)
    )
    warranty_section = ""
    if warranty:
        cards = "".join(
            f'<div class="warranty"><b>{safe(x["name"])}</b> · دستگاه {n + 1}'
            "<p>شماره سریال: ....................................</p><p>شرکت ضمانت‌کننده: ....................................</p>"
            "<p>تاریخ شروع: ................ مدت پوشش: ................ تاریخ پایان: ................</p></div>"
            for x in data["lines"]
            for n in range(x["quantity"])
        )
        warranty_section = f"""<h2 class="warranty-title">مشخصات ضمانت هر دستگاه</h2>{cards}<h2>شرایط ثبت و استفاده</h2><ul>
        <li>مدت و شرکت ضمانت‌کننده باید مطابق ضمانت واقعی همان کالا توسط فروشنده تکمیل شوند.</li>
        <li>سریال دستگاه باید با این کارت و فاکتور مطابقت داشته باشد؛ فاکتور و کارت تکمیل‌شده را نگهداری کنید.</li>
        <li>نوع خدمات و استثناهای پوشش مطابق شرایط مکتوب شرکت ضمانت‌کننده است؛ شرایط اختصاصی باید هنگام تحویل پیوست شود.</li>
        <li>برای درخواست خدمات، شرح ایراد و شماره فاکتور را به فروشنده یا شرکت ضمانت‌کننده ارائه کنید.</li>
        <li>این فرم تا تکمیل مشخصات، تاریخ، مهر و امضای فروشنده، تأییدیهٔ فعال بودن ضمانت نیست.</li></ul>
        <p>شرایط اختصاصی / پیوست ضمانت: ....................................................................</p>"""
    note = (
        "این پیش‌فاکتور موجودی را رزرو نمی‌کند. اعتبار بررسی قیمت ۲۴ ساعت است؛ هنگام ثبت نهایی قیمت و موجودی دوباره کنترل می‌شوند."
        if order.status == "draft"
        else ""
    )
    deadline = data["reservationExpiresAt"]
    if order.status == "pending_payment" and deadline:
        note = "مهلت رزرو برای پرداخت: " + deadline.astimezone(ZoneInfo("Asia/Tehran")).strftime(
            "%Y/%m/%d %H:%M"
        )
    paid_date = (
        '<p><span>تاریخ پرداخت</span>'
        + number(data["paidAt"].astimezone(ZoneInfo("Asia/Tehran")).strftime("%Y/%m/%d %H:%M"))
        + "</p>"
        if data["paidAt"] else ""
    )
    html = f"""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>{title} {order.id} | نکسورا</title><style>{DOCUMENT_STYLES}</style></head><body><main>
    <header class="masthead"><div class="brand-row"><b class="brand"><span class="brand-mark">N</span><span>NEXORA<small>فروشگاه دیجیتال نکسورا</small></span></b>
    <span class="status {safe(order.status)}">{LABELS.get(order.status, safe(order.status))}</span></div>
    <div class="title-row"><div><span class="eyebrow">جزئیات خرید شما</span><h1>{title}</h1></div><div class="number"><span>شناسهٔ فاکتور / سفارش</span><b>#{number(order.id)}</b></div></div>
    <div class="meta"><p><span>تاریخ صدور</span>{number(data["createdAt"].astimezone(ZoneInfo("Asia/Tehran")).strftime("%Y/%m/%d %H:%M"))}</p>
    <p><span>تعداد کالاها</span>{number(sum(x["quantity"] for x in data["lines"]))} عدد · {number(len(data["lines"]))} ردیف</p>{paid_date}</div></header>
    <div class="content"><div class="recipient"><section><h2><span class="section-index">۰۱</span>مشخصات تحویل‌گیرنده</h2><p class="person">{safe(addr.get("recipient"))}</p>
    <p><span class="label">شماره تماس</span><bdi>{safe(addr.get("phone"))}</bdi></p><p><span class="label">ایمیل حساب</span><bdi>{safe(data["email"])}</bdi></p></section>
    <section><h2><span class="section-index">۰۲</span>نشانی تحویل</h2><p>{safe(addr.get("province"))}، {safe(addr.get("city"))}، {safe(addr.get("address"))}</p>
    <p>پلاک: {safe(addr.get("building"))} · واحد: {safe(addr.get("unit"))}</p><p><span class="label">کد پستی</span><bdi>{safe(addr.get("postalCode"))}</bdi></p>
    {f'<p class="hint">توضیحات تحویل: {safe(addr["notes"])}</p>' if addr.get("notes") else ""}</section></div>
    <div class="section-title"><h2><b class="section-index">۰۳</b>اقلام فاکتور</h2><span>تمام مبالغ به ریال</span></div>
    <table><thead><tr><th scope="col">ردیف</th><th scope="col">کالا</th><th scope="col">تعداد</th><th scope="col">قیمت واحد</th><th scope="col">جمع ردیف</th></tr></thead><tbody>{rows}</tbody></table>
    <div class="summary"><section class="notes"><h2>یادداشت فاکتور</h2>
    {'<p class="free">ارسال رایگان برای این سفارش؛ هزینه‌ای بابت ارسال دریافت نمی‌شود.</p>' if not data["shippingRial"] else ""}
    <p>{safe(note) if note else ""}</p><p>برای پیگیری خرید، شناسهٔ فاکتور را نزد خود نگه دارید.</p></section>
    <section class="totals"><p><span>جمع کالاها</span><b>{money(data["subtotalRial"])}</b></p>
    <p><span>هزینهٔ ارسال</span><b>{money(data["shippingRial"]) if data["shippingRial"] else "رایگان"}</b></p>
    <p class="grand"><span>جمع فاکتور</span><b>{number(f'{data["totalRial"]:,}')} <small>ریال</small></b></p></section></div>{warranty_section}
    <div class="signatures"><div><b class="signature-label">تأیید فروشنده</b><small>محل مهر و امضا</small><span>تاریخ: ........................</span></div><div><b class="signature-label">تأیید تحویل‌گیرنده</b><small>محل امضا</small><span>تاریخ تحویل: ........................</span></div></div>
    <footer class="footer"><b>NEXORA</b><p class="hint">این سند رسید فروشگاه است و جایگزین صورتحساب رسمی مالیاتی نیست. نسخهٔ دانلودشده وضعیت زمان دریافت را نشان می‌دهد؛ وضعیت جاری در حساب کاربری قابل مشاهده است.</p></footer>
    <p class="hint screen-only">برای چاپ یا ذخیره PDF، گزینهٔ Print مرورگر را باز کنید؛ اندازهٔ کاغذ A4 و مقیاس ۱۰۰٪ را انتخاب کنید. برای خروجی تمیزتر، Headers and footers مرورگر را خاموش کنید. برای ذخیره فایل، مقصد را Save as PDF بگذارید.</p></div></main></body></html>"""
    kind = "warranty" if warranty else "invoice"
    return HTMLResponse(
        html,
        headers={
            "Content-Disposition": f'{"attachment" if download else "inline"}; filename="nexora-{kind}-{order.id}.html"',
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        },
    )
