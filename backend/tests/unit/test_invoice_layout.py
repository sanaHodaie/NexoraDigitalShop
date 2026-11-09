from reportlab.lib.pagesizes import A4

from app.infrastructure import wholesale_pdf as pdf


def test_long_invoice_has_bounded_pages_and_management_stamp_only_on_last_page(monkeypatch):
    positions = []
    original = pdf.Canvas.drawRightString

    def capture(self, x, y, value, *args, **kwargs):
        positions.append((self.getPageNumber(), x, y, value))
        return original(self, x, y, value, *args, **kwargs)

    monkeypatch.setattr(pdf.Canvas, 'drawRightString', capture)
    lines = [{'name': ('گوشی هوشمند با مشخصات کامل ' * 9)[:300], 'quantity': 1000000,
              'unitPriceRial': '1000000000000', 'totalRial': '1000000000000000000'} for _ in range(50)]
    raw = pdf.render_invoice({'trackingCode': '12345678', 'approvedAt': '2026-11-09T12:00:00+00:00',
                              'customer': {'name': 'مشتری نمونه', 'address': 'نشانی طولانی ' * 60},
                              'lines': lines, 'subtotalRial': '50000000000000000000',
                              'shippingRial': '1000000', 'totalRial': '50000000000001000000',
                              'terms': 'توضیحات توافق‌شده ' * 50})
    assert raw.startswith(b'%PDF') and b'Vazirmatn' in raw
    assert max(page for page, *_ in positions) > 2
    assert all(20 <= y <= A4[1] - 20 for _, _, y, _ in positions)
    stamp = [(page, x, y) for page, x, y, text in positions if text == pdf.visual('مهر و امضای مدیریت')]
    assert len(stamp) == 1
    assert stamp[0][0] == max(page for page, *_ in positions)
    assert stamp[0][1] < A4[0] / 2 and stamp[0][2] < 160
    assert sum(text == pdf.visual('راهنمای ارسال و گارانتی') for *_, text in positions) == 1
