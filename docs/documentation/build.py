"""Build self-contained print HTML; export with render.mjs using local Chromium."""
import base64
import html
import json
import re
from pathlib import Path

from content import EN_RUNBOOK, EXAMPLES, INTRO, OPS, ROOT, TECH, WEBHOOK

OUT = ROOT / 'docs/exports'
INVENTORY = json.loads((ROOT / 'docs/documentation/inventory.json').read_text())
SOURCE = 'https://github.com/sanaHodaie/NexoraDigitalShop/blob/main/'


def inline(value):
    value = html.escape(str(value))
    value = re.sub(r'`([^`]+)`', r'<code dir="ltr">\1</code>', value)
    value = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', value)
    def link(m):
        url = html.unescape(m[2])
        if not url.startswith(('https://', 'http://', '#', 'mailto:')):
            url = SOURCE + url.removeprefix('../')
        return f'<a href="{html.escape(url, quote=True)}">{m[1]}</a>'
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, value)


def markdown(text):
    lines = text.strip().splitlines()
    blocks = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line or line.startswith('<a id='):
            i += 1
            continue
        if line.startswith('```'):
            lang = line[3:].strip()
            i += 1
            code = []
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code.append(lines[i]); i += 1
            i += 1
            if lang == 'mermaid':
                blocks.append('<div class="architecture"><div>Browser / Admin</div><b>→</b><div>Vite / Vercel</div><b>→</b><div>FastAPI</div><b>→</b><div>PostgreSQL</div><span>Telegram · Worker · Redis · Email · AI</span></div>')
            else:
                blocks.append(f'<div class="code-block" dir="ltr"><div class="code-label">{inline(lang or "CODE")}</div><pre>{html.escape(chr(10).join(code))}</pre></div>')
            continue
        if line.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                row = [x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[-: ]+', x) for x in row):
                    rows.append(row)
                i += 1
            head = ''.join('<th>'+inline(x)+'</th>' for x in rows[0])
            body = ''.join('<tr>'+''.join('<td>'+inline(x)+'</td>' for x in row)+'</tr>' for row in rows[1:])
            blocks.append(f'<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>')
            continue
        heading = re.match(r'^(#{1,6})\s+(.*)', line)
        if heading:
            level = min(4, max(2, len(heading[1])))
            blocks.append(f'<h{level}>{inline(heading[2])}</h{level}>'); i += 1; continue
        if re.match(r'^(- |\d+\. )', line):
            ordered = bool(re.match(r'^\d+\.', line))
            items = []
            while i < len(lines) and re.match(r'^(- |\d+\. )', lines[i].strip()):
                items.append(re.sub(r'^(- |\d+\. )', '', lines[i].strip())); i += 1
            tag = 'ol' if ordered else 'ul'
            blocks.append(f'<{tag}>'+''.join('<li>'+inline(x)+'</li>' for x in items)+f'</{tag}>')
            continue
        para = [line]; i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|\||```|<a |\d+\. |- )', lines[i].strip()):
            para.append(lines[i].strip()); i += 1
        blocks.append('<p>'+inline(' '.join(para))+'</p>')
    return blocks


def split_sections(text):
    sections = []
    title, body = None, []
    for line in text.splitlines():
        if line.startswith('## '):
            if title:
                sections.append((title, '\n'.join(body)))
            title, body = line[3:], []
        elif title:
            body.append(line)
    if title:
        sections.append((title, '\n'.join(body)))
    return sections


PURPOSE = {
'users': ('Customer and operator identities; password hashes and optional Google subject.', 'هویت مشتری/اپراتور؛ هش رمز و شناسهٔ اختیاری گوگل.'),
'auth_sessions': ('Hashed session identifiers, expiry, idle-use and revocation state.', 'شناسهٔ هش‌شدهٔ نشست، انقضا، آخرین استفاده و ابطال.'),
'password_resets': ('Legacy/current reset-token persistence used by recovery flows.', 'نگهداری توکن بازیابی در مسیرهای مربوط.'),
'products': ('Catalogue data, base price, stock and active state.', 'کاتالوگ، قیمت پایه، موجودی و وضعیت فعال.'),
'product_media': ('Validated uploaded image bytes, persistent across redeploys.', 'بایت تصویر آپلود معتبر؛ ماندگار پس از دیپلوی.'),
'site_documents': ('Versioned site content and assistant/settings documents.', 'اسناد نسخه‌دار محتوا و تنظیمات/دستیار.'),
'cart_items': ('Per-account product quantities.', 'تعداد کالاهای سبد هر حساب.'),
'wishlist_items': ('Per-account saved product references.', 'ارجاع کالاهای علاقه‌مندی هر حساب.'),
'orders': ('Order/invoice snapshot, lifecycle, address and payment reference.', 'snapshot سفارش/فاکتور، چرخه، نشانی و مرجع پرداخت.'),
'order_lines': ('Historical product name, quantity and unit price.', 'نام تاریخی کالا، تعداد و قیمت واحد.'),
'subscribers': ('Newsletter email, associated account and signup time.', 'ایمیل خبرنامه، حساب مرتبط و زمان عضویت.'),
'admin_notification_reads': ('Per-admin newsletter notification read cursor.', 'نشانگر خواندن اعلان خبرنامه برای هر مدیر.'),
'action_tokens': ('Purpose-bound hashed account-action tokens.', 'توکن هش‌شدهٔ عملیات حساب با هدف مشخص.'),
'security_audit_logs': ('Append-oriented authentication/management evidence.', 'سابقهٔ ممیزی احراز هویت و مدیریت.'),
'email_outbox': ('Encrypted email delivery work, leases and retries.', 'کار ارسال ایمیل رمزگذاری‌شده، lease و retry.'),
'roles': ('Role names; operator-managed RBAC data.', 'نام نقش؛ دادهٔ RBAC تحت مدیریت اپراتور.'),
'role_permissions': ('Capability assignments for roles.', 'تخصیص capability به نقش.'),
'user_roles': ('User-to-role assignments.', 'انتساب نقش به کاربر.'),
'telegram_links': ('Confirmed website-account/Telegram associations.', 'ارتباط تأییدشدهٔ حساب سایت و تلگرام.'),
'telegram_link_challenges': ('Expiring single-use linking challenges.', 'چالش اتصال یک‌بارمصرف زمان‌دار.'),
'customer_requests': ('Wholesale/support enquiry, immutable approved invoice and tracking.', 'استعلام عمده/پشتیبانی، فاکتور تأییدشده و رهگیری.'),
'customer_deliveries': ('Leased/retried Telegram invoice delivery state.', 'وضعیت lease/retry ارسال فاکتور تلگرام.'),
}


def type_name(data):
    if '$ref' in data:
        return data['$ref'].split('/')[-1]
    if 'anyOf' in data:
        return ' / '.join(type_name(x) for x in data['anyOf'])
    if data.get('type') == 'array':
        return 'array<' + type_name(data.get('items', {})) + '>'
    return data.get('type', data.get('format', 'object'))


def constraint(data):
    values = []
    for k in ['minLength', 'maxLength', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'maxItems', 'minItems', 'pattern', 'enum', 'const', 'format']:
        if k in data:
            values.append(f'{k}={json.dumps(data[k], ensure_ascii=False)}')
    if 'default' in data:
        values.append('default=' + json.dumps(data['default'], ensure_ascii=False))
    return '; '.join(values) or '—'


def reference_chapters(lang):
    fa = lang == 'fa'
    index = 1 if fa else 0
    chapters = []
    schema = INVENTORY['api']
    groups = {}
    for path, methods in schema['paths'].items():
        for method, item in methods.items():
            if method not in ['get','post','put','patch','delete']:
                continue
            groups.setdefault((item.get('tags') or ['other'])[0], []).append((path, method, item))
    labelmap = {'authentication':'احراز هویت','account':'حساب و سفارش مشتری','management':'مدیریت','management app':'پنل یکپارچه','customer requests':'درخواست عمده و پشتیبانی','catalog':'کاتالوگ','assistant':'دستیار خرید','telegram':'اتصال تلگرام','health':'سلامت'}
    for group, operations in groups.items():
        blocks = markdown(('نام مسیرها و قراردادها مستقیم از OpenAPI کد استخراج شده‌اند. مجوز واقعی و خطاهای middleware باید همراه کد و توضیح جریان بررسی شوند.' if fa else 'Paths and declared contracts are extracted from source OpenAPI. Review actual permissions and middleware errors alongside the implementation and workflow notes.'))
        for path, method, item in operations:
            blocks.append(f'<h3 class="endpoint" dir="ltr"><span class="method {method}">{method.upper()}</span> {html.escape(path)}</h3>')
            auth = ('کلید سرویس بات' if fa else 'Bot service key') if path.startswith('/internal/') else (('نشست + مجوز مرتبط' if fa else 'Session + capability') if path.startswith('/api/admin') or path.startswith('/api/management') else ('مالک حساب/نشست' if fa else 'Account owner/session') if path.startswith('/api/account') else ('مطابق جریان route' if fa else 'Route-specific flow'))
            params = item.get('parameters', [])
            p = '; '.join(f"{x['name']} ({x['in']}, {type_name(x.get('schema',{}))}{', required' if x.get('required') else ''})" for x in params) or '—'
            body = item.get('requestBody',{}).get('content',{})
            b = '; '.join(f'{k}: {type_name(v.get("schema",{}))}' for k,v in body.items()) or '—'
            responses = '; '.join(f'{status}: '+('/'.join(type_name(v.get('schema',{})) for v in r.get('content',{}).values()) or r.get('description','')) for status,r in item.get('responses',{}).items())
            rows = [('Access / دسترسی', auth),('Parameters / پارامتر', p),('Body / بدنه', b),('Declared responses / پاسخ قرارداد', responses)]
            blocks.append('<div class="endpoint-detail">'+''.join(f'<p><strong>{html.escape(k.split(" / ")[1 if fa else 0])}:</strong> <span dir="auto">{html.escape(v)}</span></p>' for k,v in rows)+'</div>')
        chapters.append({'title': ('مرجع API — ' + labelmap.get(group, group)) if fa else 'API reference — ' + group, 'blocks': blocks, 'part':'REFERENCE'})
    blocks = markdown('این مدل‌ها نام و محدودیت اعلام‌شدهٔ ورودی/خروجی‌اند. علامت الزامی از قرارداد می‌آید؛ نبود مقدار nullable با الزام وجود فیلد یکی نیست.' if fa else 'These are declared request/response models and constraints. Required presence and nullable values are separate concepts.')
    for name, model in schema['components']['schemas'].items():
        blocks.append(f'<h3 dir="ltr">{html.escape(name)}</h3>')
        required = model.get('required',[])
        rows = []
        for key, data in model.get('properties',{}).items():
            rows.append([f'`{key}`', f'`{type_name(data)}`', ('بله' if fa else 'yes') if key in required else '—', '`'+constraint(data).replace('|',' / ')+'`'])
        if rows:
            headers = ['فیلد','نوع','الزامی','اعتبارسنجی / پیش‌فرض'] if fa else ['Field','Type','Required','Validation / default']
            blocks += markdown('| '+' | '.join(headers)+' |\n|---|---|---|---|\n'+'\n'.join('| '+' | '.join(row)+' |' for row in rows))
    chapters.append({'title':'فرهنگ قرارداد و اعتبارسنجی' if fa else 'Contract and validation dictionary', 'blocks':blocks,'part':'REFERENCE'})
    blocks = markdown('این فهرست از metadata مدل SQLAlchemy استخراج شده و دادهٔ زنده ندارد. قیدها و ایندکس‌های تکمیلی را در migrationها بازبینی کنید. وضعیت ماندگار webhook بات schema مستقل دارد و در این فهرست ۲۲ جدول فروشگاه نیست.' if fa else 'Extracted from SQLAlchemy metadata without live records. Review migrations for further constraints/indexes. Persistent webhook bot state uses a separate schema and is not part of these 22 store tables.')
    for table in INVENTORY['tables']:
        blocks.append(f'<h3 dir="ltr">{table["table"]}</h3>')
        blocks.append('<p>'+inline(PURPOSE.get(table['table'],('Application data','دادهٔ برنامه'))[index])+'</p>')
        headers = ['ستون','نوع SQL','NULL','کلید / ارجاع'] if fa else ['Column','SQL type','NULL','Key / reference']
        rows = []
        for c in table['columns']:
            rows.append([f'`{c["name"]}`',f'`{c["type"]}`','yes' if c['nullable'] else 'no', ('PK; ' if c['primary'] else '')+'; '.join(c['foreign']) or '—'])
        blocks += markdown('| '+' | '.join(headers)+' |\n|---|---|---|---|\n'+'\n'.join('| '+' | '.join(row)+' |' for row in rows))
    chapters.append({'title':'فرهنگ داده و روابط' if fa else 'Data dictionary and relationships', 'blocks':blocks,'part':'REFERENCE'})
    headers = ['Revision','Parent','File']
    rows = ['| `'+str(x.get('revision'))+'` | `'+str(x.get('down_revision'))+'` | `'+x['file']+'` |' for x in INVENTORY['migrations']]
    md = ('Migrationها نسخه‌دارند؛ شمارهٔ سر فعلی این snapshot برابر 0012 است. اعمال/بازگشت را قبل از Production روی محیط جدا و با بکاپ بررسی کنید.' if fa else 'Migrations are versioned; the captured head is 0012. Rehearse upgrade/downgrade compatibility in isolation and back up before production changes.')+'\n\n| '+' | '.join(headers)+' |\n|---|---|---|\n'+'\n'.join(rows)
    migration_md = md
    config_rows = []
    for source, scope in [('backend/.env.example', 'Backend'), ('telegram_bot/.env.example', 'Bot')]:
        for line in (ROOT / source).read_text().splitlines():
            m = re.match(r'^([A-Z][A-Z0-9_]+)=', line)
            if not m:
                continue
            key = m[1]
            secret = any(word in key for word in ['SECRET', 'TOKEN', 'API_KEY', 'DATABASE_URL', 'REDIS_URL'])
            if secret:
                note = 'خصوصی؛ فقط محیط مربوط، بدون درج مقدار در سند' if fa else 'Private; configure only in its owning environment, never publish values'
            elif 'PROXY' in key:
                note = 'مسیر شبکهٔ همان پردازش؛ localhost لپ‌تاپ روی میزبان کار نمی‌کند' if fa else 'Process network route; laptop localhost does not work on the host'
            elif key in ['NEXORA_API_URL', 'FRONTEND_URL', 'TELEGRAM_BOT_USERNAME']:
                note = 'نشانی/شناسهٔ عمومی محیط درست؛ API و فرانت متفاوت‌اند' if fa else 'Public origin/identity for the correct environment; API differs from frontend'
            else:
                note = 'رفتار یا محدودیت؛ مقدار/اعتبارسنجی را با نمونه و Settings/Config جاری تطبیق دهید' if fa else 'Behavior or limit; reconcile with the committed example and current Settings/Config'
            config_rows.append('| `'+key+'` | '+scope+' | '+note+' |')
    config_md = ('فهرست نام متغیرهای نمونه از فایل‌های عمومی env.example استخراج شده است، نه env خصوصی. مقادیر محرمانه عمداً درج نشده‌اند. متغیر شل می‌تواند فایل env را override کند؛ پس از تغییر، پردازش/دیپلوی مربوط را دوباره اجرا کنید.' if fa else 'Variable names are extracted from public env.example files, never private env files. Secret values are intentionally omitted. Shell variables can override env files; restart/redeploy the affected process after changes.') + '\n\n| Variable | Scope | '+('قاعده' if fa else 'Handling')+' |\n|---|---|---|\n'+'\n'.join(config_rows)
    chapters.append({'title':'مرجع متغیرهای محیطی' if fa else 'Environment variable reference', 'blocks':markdown(config_md), 'part':'REFERENCE'})
    md = migration_md
    chapters.append({'title':'تاریخچهٔ schema و مهاجرت' if fa else 'Schema migration history','blocks':markdown(md),'part':'REFERENCE'})
    rows = ['| `'+p+'` | '+(('ابزار اپراتور و API مطابق کاربرد این capability را بررسی می‌کنند؛ نام نقش به‌تنهایی کافی نیست.') if fa else 'Operator provisioning and API use-case checks enforce this capability; a role label alone is insufficient.')+' |' for p in INVENTORY['permissions']]
    md = ('نقش `nexora_app` نباید روی جدول‌های نقش/مجوز حق نوشتن بگیرد. رفع خطای ابزار ساخت مدیر با اعتبار مهاجرت انجام می‌شود، نه با گسترش مجوز runtime.' if fa else 'Do not grant the runtime nexora_app role write access to RBAC tables. Repair operator provisioning by using the authorized migration credential, not by broadening runtime permissions.')+'\n\n| Capability | '+('قاعده' if fa else 'Rule')+' |\n|---|---|\n'+'\n'.join(rows)
    chapters.append({'title':'فهرست مجوزهای مدیریت' if fa else 'Management permission catalogue','blocks':markdown(md),'part':'REFERENCE'})
    return chapters


def chapters_for(lang):
    fa = lang == 'fa'
    chapters = []
    def add_md(md, part):
        for title, body in split_sections(md):
            chapters.append({'title':title,'blocks':markdown(body),'part':part})
    add_md(INTRO[lang], 'ORIENTATION')
    readme = (ROOT / ('README.fa.md' if fa else 'README.md')).read_text()
    for title, body in split_sections(readme):
        if title in ['Contents','فهرست','Further documentation','مستندات تکمیلی','Run locally without Docker','اجرای محلی بدون Docker']:
            continue
        chapters.append({'title':title,'blocks':markdown(body),'part':'PRODUCT & SYSTEM'})
    add_md(TECH[lang], 'ENGINEERING')
    add_md((ROOT/'docs/LOCAL_RUNBOOK.fa.md').read_text() if fa else EN_RUNBOOK, 'RUNBOOK')
    add_md(WEBHOOK[lang], 'RUNBOOK')
    add_md(EXAMPLES[lang], 'CONTRACTS')
    chapters.extend(reference_chapters(lang))
    add_md(OPS[lang], 'OPERATIONS')
    tail = '''## واژه‌نامه و راهنمای منابع
| واژه | معنی |
|---|---|
| Runtime | پردازش روزمره با اعتبار محدود برنامه. |
| Migration | تغییر نسخه‌دار schema با اعتبار مجاز. |
| RBAC / Capability | نقش و قابلیت صریح کنترل دسترسی. |
| CSRF | اتصال mutation مرورگر به nonce و نشست معتبر. |
| Snapshot | دادهٔ تاریخی ذخیره‌شده، مستقل از ویرایش بعدی. |
| Outbox / Lease | صف پایدار و مالکیت زمان‌دار پردازش job. |
| Idempotency | تکرار درخواست، نتیجهٔ تجاری تکراری نمی‌سازد. |
| RPO / RTO | میزان قابل قبول ازدست‌رفتن داده / زمان بازیابی. |

مرجع زندهٔ development در `/docs` است؛ UI مستندات در Production غیرفعال است. نسخهٔ OpenAPI همراه این سند snapshot کد است. منابع اصلی: `README.fa.md`، `docs/LOCAL_RUNBOOK.fa.md`، `backend/app`، `backend/alembic/versions`، `telegram_bot`، `vercel.json` و `.github/workflows/backend.yml`.

اطلاعات تغییرپذیر و تصمیم‌های مالک را در هر انتشار بازبینی کنید. نسخهٔ کد و فهرست استخراج‌شده کنار فایل‌های PDF قرار دارند؛ فایل‌های محرمانه هرگز منبع قابل انتشار سند نیستند.
''' if fa else '''## Glossary and source guide
| Term | Meaning |
|---|---|
| Runtime | Normal application process using a restricted credential. |
| Migration | Versioned schema change using an authorized credential. |
| RBAC / capability | Roles plus explicit access-control capabilities. |
| CSRF | Browser mutation bound to a valid nonce/session. |
| Snapshot | Stored historical data unaffected by later edits. |
| Outbox / lease | Durable work queue and time-bounded job ownership. |
| Idempotency | Repeating an operation does not duplicate its business effect. |
| RPO / RTO | Acceptable data-loss window / recovery-time target. |

Development interactive API documentation is at `/docs`; that UI is disabled in production. The accompanying OpenAPI file is a source snapshot. Primary references are `README.md`, `docs/LOCAL_RUNBOOK.fa.md`, `backend/app`, `backend/alembic/versions`, `telegram_bot`, `vercel.json` and `.github/workflows/backend.yml`.

Review variable operational facts and owner decisions for each release. The code revision and extracted inventory accompany the PDFs. Private configuration files are never publishable documentation sources.
'''
    add_md(tail, 'REFERENCE')
    return chapters


CSS = '''
@font-face{font-family:Vazir;src:url(data:font/ttf;base64,__REGULAR__) format('truetype');font-weight:400}
@font-face{font-family:Vazir;src:url(data:font/ttf;base64,__BOLD__) format('truetype');font-weight:700}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#ece7ec;color:#34243d;font-family:Vazir,sans-serif;font-size:10.1pt;line-height:1.83;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:0}.sheet{position:relative;width:210mm;height:297mm;margin:8mm auto;background:#fffdfd;overflow:hidden;break-after:page;page-break-after:always;box-shadow:0 10px 50px #39233b17}.sheet:last-child{break-after:auto;page-break-after:auto}.sheet:before{content:'';position:absolute;inset:0 0 auto;height:2.8mm;background:linear-gradient(90deg,#b73577,#ed9db9,#d3c5f4)}
.page-header{position:absolute;top:13mm;left:17mm;right:17mm;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #ecdce6;padding-bottom:7px;font-size:7.7pt;color:#866378}.wordmark{font-weight:700;letter-spacing:2px;color:#842957}.part{font-size:7pt;letter-spacing:1.1px}.flow{position:absolute;top:32mm;bottom:24mm;left:17mm;right:17mm;overflow:visible}.page-footer{position:absolute;bottom:10mm;left:17mm;right:17mm;border-top:1px solid #ecdce6;padding-top:7px;display:flex;justify-content:space-between;font-size:7pt;color:#947e91}.page-no{background:#f9e7ef;border-radius:8px;min-width:29px;text-align:center;color:#9b3568;font-weight:700}
h1,h2,h3,h4{color:#4a2445;line-height:1.55;font-weight:700;break-after:avoid}h1{font-size:23pt;margin:0 0 15px}h2{font-size:18pt;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #f0d6e3}h3{font-size:12.4pt;margin:18px 0 9px}h4{font-size:11pt;margin:14px 0 7px}p{margin:0 0 11px;text-align:start}strong{font-weight:700;color:#773658}ul,ol{margin:0 0 13px;padding-inline-start:23px}li{margin-bottom:5px;padding-inline-start:3px}li::marker{color:#bc548b}a{color:#9d3371;text-decoration:none;border-bottom:1px solid #ebc5d8;overflow-wrap:anywhere}code{unicode-bidi:isolate;font-family:Vazir,sans-serif;font-size:.86em;color:#8b3165;background:#faedf3;border-radius:4px;padding:1px 4px;overflow-wrap:anywhere}pre{direction:ltr;text-align:left;unicode-bidi:plaintext;white-space:pre-wrap;overflow-wrap:anywhere;font-family:Vazir,sans-serif;font-size:8.5pt;line-height:1.73;margin:0;color:#f9edf4}.code-block{background:#32233d;border-radius:12px;margin:10px 0 16px;padding:13px 16px;box-shadow:inset 3px 0 #e79abb}.code-label{font-size:7pt;letter-spacing:1.2px;color:#f0b6cf;text-transform:uppercase;border-bottom:1px solid #ffffff22;padding-bottom:6px;margin-bottom:8px}
table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:8.8pt;line-height:1.8;margin:9px 0 16px;border:1px solid #eedde6;border-radius:10px;overflow:hidden}thead{background:#f6e3ed;color:#6d3155}th{text-align:start;font-weight:700;padding:9px 10px;border-bottom:1px solid #e9c8da}td{vertical-align:top;padding:8px 10px;border-bottom:1px solid #f1e4eb;overflow-wrap:anywhere}tr:last-child td{border-bottom:0}tbody tr:nth-child(even){background:#fff7fa}table code{background:none;padding:0;font-size:8pt}td:first-child{color:#744560}thead{display:table-header-group}tr{break-inside:avoid}.endpoint{font-size:10pt;overflow-wrap:anywhere;background:#f8edf4;padding:8px 10px;border-radius:9px;margin:14px 0 7px}.method{font-size:7pt;font-weight:700;background:#b73577;color:white;display:inline-block;min-width:36px;text-align:center;margin-inline-end:6px;border-radius:4px;padding:2px 4px}.method.get{background:#417e82}.method.delete{background:#b04f67}.method.patch,.method.put{background:#7e63a8}.endpoint-detail{border-inline-start:2px solid #e9c3d8;padding-inline-start:10px;margin-bottom:14px;font-size:8.3pt;line-height:1.8;overflow-wrap:anywhere}.endpoint-detail p{margin-bottom:4px}
.chapter-kicker{font-size:8pt;letter-spacing:1px;color:#bd5c8b;margin-bottom:8px}.continued{font-size:11pt;color:#976b87;font-weight:700;margin-bottom:15px;border-bottom:1px solid #eddfe7;padding-bottom:7px}.architecture{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;padding:22px 12px;border-radius:17px;background:#fbedf3;margin-bottom:20px;direction:ltr}.architecture div{padding:12px 10px;background:white;border:1px solid #e5cadb;border-radius:10px;font-size:8pt;font-weight:700}.architecture b{color:#ad4d7f}.architecture span{flex-basis:100%;text-align:center;font-size:8pt;color:#88718a;margin-top:10px}
.cover{background:radial-gradient(ellipse at 90% 5%,#f3bfd5 0,transparent 48%),radial-gradient(ellipse at 0% 95%,#e7dcf7 0,transparent 52%),#fff7fa}.cover:after{content:'';position:absolute;width:115mm;height:115mm;border:1px solid #dbaac4;border-radius:50%;left:-35mm;bottom:-25mm;box-shadow:0 0 0 13mm #ffffff36,0 0 0 27mm #ffffff2b}.cover-inner{position:absolute;inset:24mm 20mm 23mm;z-index:1}.brand-row{display:flex;align-items:center;gap:13px;direction:ltr}.logo{width:49px;height:49px;background:linear-gradient(145deg,#b73577,#74417d);color:#fff;border-radius:16px;display:grid;place-items:center;font-size:25px;font-weight:700;transform:rotate(-7deg);box-shadow:0 10px 20px #a63b7726}.brand-name{font-size:15px;letter-spacing:3px;font-weight:700}.brand-sub{font-size:8px;letter-spacing:2px;color:#95647e}.cover-eyebrow{margin-top:48mm;font-size:9pt;letter-spacing:2px;color:#a44876}.cover h1{font-size:36pt;line-height:1.55;margin:14px 0 15px;max-width:155mm}.cover .subtitle{font-size:12pt;color:#825b78;line-height:2.1;max-width:145mm}.cover-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}.cover-tags span{border:1px solid #dab4ca;padding:6px 12px;border-radius:30px;font-size:8pt;background:#ffffff88;color:#8d416d}.cover-bottom{position:absolute;bottom:0;left:0;right:0;display:grid;grid-template-columns:1fr 1fr;gap:12px;border-top:1px solid #d6b4ca;padding-top:18px;font-size:8pt;color:#895b77}.cover-bottom strong{display:block;font-size:9pt;margin-bottom:4px}.toc-row{display:flex;align-items:baseline;gap:10px;border-bottom:1px solid #f0e2eb;padding:6px 0;font-size:9.4pt;line-height:1.65}.toc-title{flex:1}.toc-num{font-variant-numeric:tabular-nums;color:#a54175;font-weight:700}.toc-id{font-size:8pt;color:#b18aa4}.toc-row a{border:0;color:inherit}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.stat{padding:17px;border:1px solid #e9cfdf;border-radius:13px;background:#fff5f9;text-align:center}.stat b{display:block;font-size:23pt;color:#b73577}.stat span{font-size:8pt;color:#8e6580}
[dir=rtl] .cover h1{font-size:33pt}[dir=rtl] pre{font-size:8.3pt}[dir=rtl] table{font-size:9pt}[dir=rtl] .flow{line-height:1.95}
@media print{html,body{background:white}.sheet{margin:0;box-shadow:none}}
'''

JS = '''
const chapters=__CHAPTERS__;
const lang=__LANG__,fa=lang==='fa';
const root=document.getElementById('pages');
const tocPages=[];const locations=[];const warnings=[];
const number=n=>fa?String(n).replace(/\\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]):String(n);
function sheet(title,part){const page=document.createElement('article');page.className='sheet';page.innerHTML=`<header class="page-header"><span class="wordmark" dir="ltr">NEXORA / DOCUMENTATION</span><span class="part">${part}</span></header><main class="flow"></main><footer class="page-footer"><span>${fa?'دفترچهٔ فنی و عملیاتی · نسخهٔ ۲۰۲۶':'Technical & operations handbook · 2026 edition'}</span><span class="page-no"></span></footer>`;root.append(page);return {page,flow:page.querySelector('.flow')};}
function isOverflow(flow){return flow.scrollHeight>flow.clientHeight+1;}
function fromHTML(markup){const t=document.createElement('template');t.innerHTML=markup;return t.content.firstElementChild;}
function paginate(){
 const tocCount=Math.ceil(chapters.length/20);
 for(let i=0;i<tocCount;i++){const s=sheet('',fa?'فهرست راهنما':'CONTENTS');s.flow.innerHTML=`<div class="chapter-kicker">${fa?'نقشهٔ مطالعه':'READING MAP'}</div><h2>${fa?'فهرست مطالب':'Contents'}${tocCount>1?' · '+number(i+1):''}</h2><div class="toc-list"></div>`;tocPages.push(s);}
 chapters.forEach((ch,index)=>{
  let s=sheet(ch.title,ch.part);locations.push(root.children.length);
  s.flow.innerHTML=`<div class="chapter-kicker">${fa?'بخش':'CHAPTER'} ${number(index+1)}</div><h2 id="chapter-${index}">${ch.title}</h2>`;
  function next(){s=sheet(ch.title,ch.part);s.flow.innerHTML=`<div class="continued">${ch.title} · ${fa?'ادامه':'continued'}</div>`;}
  function add(el){
   s.flow.append(el);
   if(isOverflow(s.flow)){
    el.remove();
    const last=s.flow.lastElementChild;
    let orphan=null;
    if(last&&/^H[234]$/.test(last.tagName)&&s.flow.children.length>2){orphan=last;orphan.remove();}
    next();if(orphan)s.flow.append(orphan);s.flow.append(el);
    if(isOverflow(s.flow))warnings.push('Oversized '+ch.title+': '+el.tagName);
   }
  }
  ch.blocks.forEach(markup=>{
   const el=fromHTML(markup);if(!el)return;
   if(el.tagName==='TABLE'){
    const rows=[...el.querySelectorAll('tbody>tr')];
    const makeTable=()=>{const t=el.cloneNode(false);t.append(el.querySelector('thead').cloneNode(true));t.append(document.createElement('tbody'));return t;};
    let table=makeTable();s.flow.append(table);
    for(const row of rows){table.tBodies[0].append(row);if(isOverflow(s.flow)){
      row.remove();if(!table.tBodies[0].children.length)table.remove();
      const last=s.flow.lastElementChild;let orphan=null;if(last&&/^H[234]$/.test(last.tagName)&&s.flow.children.length>2){orphan=last;orphan.remove();}
      next();if(orphan)s.flow.append(orphan);table=makeTable();s.flow.append(table);table.tBodies[0].append(row);
      if(isOverflow(s.flow))warnings.push('Oversized table row '+ch.title);
    }}
   }else if(['UL','OL'].includes(el.tagName)&&el.children.length>5){
    let list=el.cloneNode(false);s.flow.append(list);let count=0;
    for(const li of [...el.children]){list.append(li);count++;if(isOverflow(s.flow)){li.remove();if(!list.children.length)list.remove();next();list=el.cloneNode(false);if(el.tagName==='OL')list.start=count;s.flow.append(list);list.append(li);}}
   }else{add(el);}
  });
 });
 chapters.forEach((ch,i)=>{const row=document.createElement('div');row.className='toc-row';row.innerHTML=`<span class="toc-id">${number(i+1).padStart(2,'0')}</span><span class="toc-title"><a href="#chapter-${i}">${ch.title}</a></span><span class="toc-num">${number(locations[i])}</span>`;tocPages[Math.floor(i/20)].flow.querySelector('.toc-list').append(row);});
 [...root.children].forEach((page,i)=>{const n=page.querySelector('.page-no');if(n)n.textContent=number(i+1);if(page.querySelector('.flow')&&isOverflow(page.querySelector('.flow')))warnings.push('Page overflow '+(i+1));});
 window.DOC_RESULT={pages:root.children.length,warnings,chapters:chapters.length,locations,apiOperations:91,tables:22};document.documentElement.dataset.ready='true';
}
document.fonts.ready.then(paginate);
'''


def build(lang):
    fa = lang == 'fa'
    chapters = chapters_for(lang)
    regular = base64.b64encode((ROOT/'public/assets/admin/Vazirmatn-Regular.ttf').read_bytes()).decode()
    bold = base64.b64encode((ROOT/'public/assets/admin/Vazirmatn-Bold.ttf').read_bytes()).decode()
    css = CSS.replace('__REGULAR__',regular).replace('__BOLD__',bold)
    title = 'مستندات جامع\nنکسورا دیجیتال' if fa else 'Nexora Digital Shop\nComplete Handbook'
    title = title.replace('\n','<br>')
    subtitle = 'راهنمای محصول، معماری، توسعه و عملیات<br>از اجرای محلی تا مدیریت سفارش و استقرار' if fa else 'Product, architecture, development and operations<br>From local startup to production administration'
    cover = f'''<article class="sheet cover"><div class="cover-inner"><div class="brand-row"><div class="logo">N</div><div><div class="brand-name">NEXORA</div><div class="brand-sub">DIGITAL SHOP / ENGINEERING</div></div></div><div class="cover-eyebrow">{'نسخهٔ فارسی · راهنمای مرجع' if fa else 'ENGLISH EDITION / REFERENCE HANDBOOK'}</div><h1>{title}</h1><p class="subtitle">{subtitle}</p><div class="cover-tags"><span>Storefront & Admin</span><span>FastAPI & PostgreSQL</span><span>Telegram</span></div><div class="stats"><div class="stat"><b>{'۹۱' if fa else '91'}</b><span>{'عملیات API' if fa else 'API operations'}</span></div><div class="stat"><b>{'۲۲' if fa else '22'}</b><span>{'جدول فروشگاه' if fa else 'Store tables'}</span></div><div class="stat"><b>{'۱۲' if fa else '12'}</b><span>{'Migration'}</span></div></div><div class="cover-bottom"><div><strong>{'نسخه و تاریخ' if fa else 'BASELINE & DATE'}</strong><span dir="ltr">{INVENTORY['commit']} · 15 Nov 2026</span></div><div><strong>{'دامنهٔ سند' if fa else 'DOCUMENT SCOPE'}</strong>{'کد موجود، اجرا، مرجع و محدودیت‌ها' if fa else 'Implemented system, runbooks & limitations'}</div></div></div></article>'''
    script = JS.replace('__CHAPTERS__', json.dumps(chapters,ensure_ascii=False).replace('</','<\\/')).replace('__LANG__',json.dumps(lang))
    result = f'<!doctype html><html lang="{lang}" dir="{"rtl" if fa else "ltr"}"><head><meta charset="utf-8"><title>Nexora Documentation — {lang.upper()}</title><style>{css}</style></head><body><div id="pages">{cover}</div><script>{script}</script></body></html>'
    (OUT/f'Nexora-Documentation-{lang.upper()}.html').write_text(result)
    (ROOT/f'docs/documentation/chapters.{lang}.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2)+'\n')
    print(lang,len(chapters),'chapters')


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True,parents=True)
    for language in ['fa','en']:
        build(language)
