import React from 'react';
import { Download, Printer, RefreshCw, ShieldCheck, MapPin, UserRound, Package, Truck, FileText } from 'lucide-react';
import './invoice.css';

export const invoiceStatuses = { draft: 'در صف پرداخت · پیش‌فاکتور', pending: 'در صف پرداخت', pending_payment: 'در صف پرداخت', paid: 'پرداخت شده', cancelled: 'لغو شده', expired: 'منقضی شده' };
const number = n => new Intl.NumberFormat('fa-IR').format(n);
const money = n => `${number(typeof n==='string'?BigInt(n):n)} ریال`;
const date = n => n ? new Date(n).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) : 'ثبت نشده';

export default function InvoiceSheet({invoice,path,admin=false,busy=false,error='',onRefresh,pdfUrl,htmlUrl}) {
  const a = invoice.shippingAddress;
  const wholesale=invoice.source==='telegram';
  const zeroShipping=BigInt(invoice.shippingRial)===0n;
  return <section className="invoice-sheet" dir="rtl" aria-label="فاکتور سفارش">
    <header className="invoice-heading">
      <div className="invoice-brand-row"><span className="invoice-brand"><span className="invoice-brand-mark" aria-hidden="true">N</span><span>NEXORA<small>فروشگاه دیجیتال نکسورا</small></span></span><span className={`invoice-badge ${invoice.status}`}>{wholesale?'عمدهٔ تأییدشده · پرداخت بررسی نشده':invoiceStatuses[invoice.status] || invoice.status}</span></div>
      <div className="invoice-title-row"><div><span className="invoice-eyebrow">جزئیات خرید شما</span><h2>{wholesale?'فاکتور فروش عمده':invoice.status === 'draft' ? 'پیش‌فاکتور فروش' : 'فاکتور فروش'}</h2></div><div className="invoice-number"><span>{wholesale?'کد رهگیری فاکتور عمده':'شناسهٔ فاکتور و سفارش'}</span><b><span aria-hidden="true">#</span>{wholesale?invoice.trackingCode:number(invoice.id)}</b></div></div>
      <div className="invoice-meta"><p><span>تاریخ صدور</span><b>{date(invoice.createdAt)}</b></p><p><span>تعداد کالاها</span><b>{number(invoice.lines.reduce((sum, line) => sum + line.quantity, 0))} عدد · {number(invoice.lines.length)} ردیف</b></p>{invoice.paidAt && <p><span>تاریخ پرداخت</span><b>{date(invoice.paidAt)}</b></p>}</div>
    </header>
    <div className="invoice-actions">
      {(admin||wholesale)&&<a className="invoice-download" href={pdfUrl||`/api${path}/invoice.pdf`} download><Download size={16}/>دانلود فاکتور PDF</a>}
      <a className="invoice-download" href={htmlUrl||`/api${path}/invoice`} download><Download size={16}/>دانلود فاکتور HTML</a>
      <a href={(htmlUrl||`/api${path}/invoice`)+'?download=false'} target="_blank" rel="noreferrer"><Printer size={16}/>چاپ / ذخیره PDF</a>
      <button type="button" disabled={busy} onClick={onRefresh} aria-label="به‌روزرسانی فاکتور"><RefreshCw size={16}/>به‌روزرسانی</button>
      {admin && !wholesale && invoice.status === 'paid' && <><a href={`/api${path}/warranty?download=false`} target="_blank" rel="noreferrer"><ShieldCheck size={16}/>کارت گارانتی و چاپ</a><a href={`/api${path}/warranty`} download><Download size={16}/>دانلود کارت گارانتی</a></>}
    </div>
    {error && <p className="invoice-error" role="alert">{error}</p>}
    <div className="invoice-body">
      <div className="invoice-recipient">
        <section><h3><UserRound size={17}/>مشخصات تحویل‌گیرنده</h3>{a && <><p className="invoice-person">{a.recipient}</p><p><span className="invoice-field-label">شماره تماس</span><bdi>{a.phone}</bdi></p></>}{invoice.company&&<p><span className="invoice-field-label">شرکت / فروشگاه</span>{invoice.company}</p>}{invoice.email&&<p><span className="invoice-field-label">ایمیل حساب</span><bdi>{invoice.email}</bdi></p>}</section>
        <section><h3><MapPin size={17}/>نشانی تحویل</h3>{a ? <><p>{[a.province,a.city,a.address,a.building?`پلاک ${a.building}`:'',a.unit?`واحد ${a.unit}`:''].filter(Boolean).join('، ')}</p>{a.postalCode&&<p><span className="invoice-field-label">کد پستی</span><bdi>{a.postalCode}</bdi></p>}{a.notes && <p className="invoice-delivery-note">توضیحات تحویل: {a.notes}</p>}</> : <p>آدرس برای این سفارش قدیمی ثبت نشده است.</p>}</section>
      </div>
      <div className="invoice-section-title"><h3><Package size={18}/>اقلام فاکتور</h3><span>تمام مبالغ به ریال</span></div>
      <div className="invoice-lines">{invoice.lines.map((line, i) => <article className="invoice-line" key={line.productId||i}><div className="invoice-product"><span className="invoice-row-number">{number(i + 1)}</span><div><h3>{line.name}</h3>{line.productId&&<small>شناسهٔ کالا: <bdi>{line.productId}</bdi></small>}</div></div><dl><div><dt>تعداد</dt><dd>{number(line.quantity)}</dd></div><div><dt>قیمت واحد</dt><dd>{money(line.unitPriceRial)}</dd></div><div><dt>جمع ردیف</dt><dd>{money(line.totalRial)}</dd></div></dl></article>)}</div>
      <div className="invoice-summary">
        <div className="invoice-notes"><h3><FileText size={17}/>یادداشت فاکتور</h3>
          {zeroShipping && !wholesale && <p className="invoice-free-shipping"><Truck size={18}/>ارسال رایگان برای این سفارش</p>}
          {wholesale&&<p className="invoice-notice">تأیید سفارش عمده به‌معنی تأیید پرداخت نیست. این فاکتور براساس قیمت توافقی صادر شده است.</p>}
          {invoice.terms&&<p className="invoice-notice whitespace-pre-wrap">{invoice.terms}</p>}
          {invoice.status === 'draft' && <p className="invoice-notice">این پیش‌فاکتور هنوز سفارش نهایی نیست و کالا را رزرو نمی‌کند. اعتبار بررسی قیمت ۲۴ ساعت است؛ قیمت و موجودی هنگام ثبت نهایی دوباره بررسی می‌شوند.</p>}
          {invoice.status === 'pending_payment' && <p className="invoice-notice">در صف پرداخت؛ مهلت رزرو: {date(invoice.reservationExpiresAt)}. وضعیت فاکتور پس از تأیید دریافت واقعی مبلغ به «پرداخت شده» تغییر می‌کند.</p>}
          <p className="invoice-notice">برای پیگیری خرید، شناسهٔ فاکتور را نزد خود نگه دارید.</p>
        </div>
        <div className="invoice-totals"><p><span>جمع کالاها</span><b>{money(invoice.subtotalRial)}</b></p><p><span>هزینهٔ ارسال</span><b>{zeroShipping?(wholesale?'۰ ریال · طبق توافق':'رایگان'):money(invoice.shippingRial)}</b></p><p className="invoice-grand"><span>جمع فاکتور</span><b>{number(typeof invoice.totalRial==='string'?BigInt(invoice.totalRial):invoice.totalRial)} <small>ریال</small></b></p></div>
      </div>
      <section className="invoice-delivery-warranty"><h3>راهنمای ارسال و گارانتی</h3><p>روش و زمان ارسال پس از هماهنگی با خریدار تعیین می‌شود؛ پیش از ارسال، نشانی و شماره تماس تأیید شود. هزینه مطابق مبلغ درج‌شده در فاکتور است.</p><p>گارانتی هر کالا مطابق شرایط اعلام‌شده برای همان کالا است؛ نام شرکت گارانتی و مدت پوشش پیش از تحویل بررسی شود. فاکتور و شناسهٔ کالا را برای پیگیری نگه دارید.</p></section>
      {admin && invoice.paymentReference && <p>شناسهٔ تراکنش: <bdi>{invoice.paymentReference}</bdi></p>}
      {admin && <div className="invoice-signatures"><div><span>تأیید تحویل‌گیرنده</span><b>محل امضا</b><small>تاریخ تحویل: ........................</small></div><div><span>مهر و امضای مدیریت</span><b>محل مهر و امضا</b><small>تاریخ: ........................</small></div></div>}
      <footer className="invoice-footer"><span className="invoice-footer-brand">NEXORA</span><p className="invoice-footnote">نسخهٔ دانلودشده وضعیت زمان دریافت را نشان می‌دهد؛ برای وضعیت جدید دوباره دانلود کنید. این سند جایگزین صورتحساب رسمی مالیاتی نیست.</p></footer>
    </div>
  </section>;
}
