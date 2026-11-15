"""Publication QA. Requires PyMuPDF and fontTools in the document-build environment."""
import json
import re
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[2]
source = json.loads((ROOT/'docs/documentation/inventory.json').read_text())
reports = json.loads((ROOT/'docs/documentation/render-report.json').read_text())
operations = sum(method in {'get','post','put','patch','delete'} for methods in source['api']['paths'].values() for method in methods)
results = []
for report in reports:
    lang = report['language']
    path = ROOT/f'docs/exports/Nexora-Documentation-{lang}.pdf'
    doc = fitz.open(path)
    assert len(doc) == report['pages']
    assert not report['warnings']
    assert report['apiOperations'] == operations == 91
    assert report['tables'] == len(source['tables']) == 22
    assert len(doc.get_toc()) >= report['chapters']
    assert all(abs(page.rect.width-595.3)<2 and abs(page.rect.height-841.9)<2 for page in doc)
    assert all(len(page.get_text().strip())>40 for page in doc)
    text = ''.join(page.get_text() for page in doc)
    # PDF text remains searchable; whitespace can occur at long-path wraps.
    compact = re.sub(r'\s+', '', text)
    missing = [route for route in source['api']['paths'] if route not in compact]
    assert not missing, (lang, 'missing API paths', missing)
    assert all(table['table'] in text for table in source['tables'])
    fonts = {font[0] for page in doc for font in page.get_fonts()}
    assert all(doc.extract_font(xref)[3] for xref in fonts)
    assert '\ufffd' not in text
    # Active content must not be present in delivered PDFs.
    assert b'/JavaScript' not in path.read_bytes()
    results.append({'language':lang,'pages':len(doc),'chapters':report['chapters'],
                    'api_operations':operations,'store_tables':len(source['tables']),
                    'migrations':len(source['migrations']),'bookmarks':len(doc.get_toc()),
                    'embedded_fonts':len(fonts),'searchable_api_paths':len(source['api']['paths']),
                    'empty_pages':0,'overflow_warnings':0,'file_bytes':path.stat().st_size})
print(json.dumps(results,ensure_ascii=False,indent=2))
(ROOT/'docs/documentation/validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
