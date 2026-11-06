"""Real XLSX and DOCX reports; bounded input, escaped XML and inert spreadsheet cells."""
import re
from html import escape
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

HEADERS = ["شناسه", "رویداد", "تاریخ UTC", "نام کاربر", "ایمیل", "شناسه کاربر", "شناسه مرتبط"]


def inert(value):
    text = clean(value)
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text


def clean(value):
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff\ufffe\uffff]', '', str(value if value is not None else ''))[:32700]


def spreadsheet(rows):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "گزارش رویدادها"
    sheet.sheet_view.rightToLeft = True
    sheet.append(HEADERS)
    for row in rows:
        sheet.append([inert(value) for value in row])
    for cell in sheet[1]:
        cell.fill = PatternFill("solid", fgColor="2965ED")
        cell.font = Font(name="Vazirmatn", color="FFFFFF", bold=True)
    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.font = Font(name="Vazirmatn", size=11)
            cell.alignment = Alignment(horizontal="right", wrap_text=True)
    for column, width in zip("ABCDEFG", [12, 35, 28, 28, 38, 18, 25]):
        sheet.column_dimensions[column].width = width
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    output = BytesIO()
    workbook.save(output)
    return output.getvalue()


def word_document(rows):
    def paragraph(value):
        safe = escape(clean(value))
        return ('<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr>'
                '<w:rFonts w:ascii="Vazirmatn" w:hAnsi="Vazirmatn" w:cs="Vazirmatn"/><w:rtl/>'
                '</w:rPr><w:t xml:space="preserve">' + safe + '</w:t></w:r></w:p>')

    def table_row(values, header=False):
        cells = ''.join('<w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/>'
                        + ('<w:shd w:fill="DCE8FF"/>' if header else '')
                        + '</w:tcPr>' + paragraph(v) + '</w:tc>' for v in values)
        return '<w:tr>' + ('<w:trPr><w:tblHeader/></w:trPr>' if header else '') + cells + '</w:tr>'

    body = paragraph("NEXORA — گزارش رویدادهای مدیریت") + paragraph("تاریخ‌های گزارش بر حسب UTC هستند.")
    body += '<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="0" w:type="auto"/>'
    body += '<w:tblBorders>' + ''.join(f'<w:{n} w:val="single" w:sz="4" w:color="CBD5E1"/>' for n in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']) + '</w:tblBorders></w:tblPr>'
    body += '<w:tblGrid>' + '<w:gridCol w:w="1400"/>' * 7 + '</w:tblGrid>'
    body += table_row(HEADERS, True) + ''.join(table_row(row) for row in rows) + '</w:tbl>'
    body += '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>'
    document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '</w:body></w:document>'
    output = BytesIO()
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        archive.writestr('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        archive.writestr('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
        archive.writestr('word/document.xml', document)
    return output.getvalue()
