import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpLeft, Check, ChevronDown, Headphones, Heart, LayoutDashboard, LogOut, Package, RefreshCw, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import { api } from '../api/client';
import { useShop } from '../context/ShopContext';
import './account.css';
import phoneImage from '../assets/images/account-phone.png';
import { ChangePassword } from '../components/Auth/ChangePassword';

const sections = [
  ['overview', 'نمای کلی', LayoutDashboard], ['orders', 'سفارش‌های من', Package],
  ['wishlist', 'علاقه‌مندی‌ها', Heart], ['cart', 'سبد خرید', ShoppingBag],
  ['profile', 'اطلاعات شخصی', UserRound], ['security', 'امنیت حساب', ShieldCheck],
];
const statuses = { pending_payment: 'در انتظار پرداخت', paid: 'پرداخت‌شده', processing: 'در حال پردازش', shipped: 'ارسال‌شده', delivered: 'تحویل‌شده', cancelled: 'لغوشده', refunded: 'بازپرداخت‌شده' };
const dateFormat = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' });
function dateLabel(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : dateFormat.format(date); }
function Empty({ icon: Icon = Package, title, children }) {
  return <div className="account-empty"><span className="account-empty-icon"><Icon size={30} /></span><h3>{title}</h3><p>{children}</p><a className="account-button secondary" href="/#trending">گشت‌وگذار در فروشگاه <ArrowUpLeft size={17} /></a></div>;
}
function Failure({ retry }) { return <div className="account-notice" role="alert">دریافت اطلاعات انجام نشد. <button type="button" onClick={retry}>تلاش مجدد <RefreshCw size={15} /></button></div>; }
function Loading() { return <div role="status" className="account-loading"><span />در حال دریافت اطلاعات حساب…</div>; }

function OrderCard({ order }) {
  const { formatPrice, toPersianDigits } = useShop();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [state, setState] = useState('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setState('loading');
    api(`/account/orders/${order.id}`, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) { setDetail(data); setState('ready'); }
    }).catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [open, order.id, retry]);
  return <article className="account-order">
    <div className="account-order-top"><span className="account-order-icon"><Package size={20} /></span><div><h3>سفارش شمارهٔ {toPersianDigits(order.id)}</h3><time dateTime={order.createdAt}>{dateLabel(order.createdAt)}</time></div><span className={`account-status ${order.status === 'pending_payment' ? 'pending' : ''}`}>{statuses[order.status] || 'در حال بررسی'}</span></div>
    <div className="account-order-bottom"><strong>{formatPrice(order.total)}</strong><button type="button" aria-expanded={open} aria-controls={`order-${order.id}`} onClick={() => setOpen(!open)}>{open ? 'بستن جزئیات' : 'جزئیات سفارش'}<ChevronDown size={16} className={open ? 'rotate-180' : ''} /></button></div>
    {open && <div id={`order-${order.id}`} className="account-order-detail">
      {state === 'loading' ? <Loading /> : state === 'error' ? <Failure retry={() => setRetry(retry + 1)} /> : <>
        {detail.lines.map(line => <div className="account-order-line" key={line.productId}><span>{line.name}<small>{toPersianDigits(line.quantity)} عدد</small></span><b>{formatPrice(line.unitPrice * line.quantity)}</b></div>)}
        <div className="account-order-line"><span>هزینهٔ ارسال</span><b>{formatPrice(detail.shipping)}</b></div>
        {order.status === 'pending_payment' && <p className="account-muted">این سفارش هنوز پرداخت نشده است. درگاه پرداخت آنلاین در حال حاضر فعال نیست.</p>}
      </>}
    </div>}
  </article>;
}

function Profile() {
  const { user, setUser } = useShop();
  const [name, setName] = useState(user.fullName || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const save = async event => {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try { const result = await api('/account/profile', { method: 'PATCH', body: JSON.stringify({ fullName: name.trim() }) }); setUser(result); setMessage('اطلاعات حساب شما ذخیره شد.'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <section className="account-panel"><h2>اطلاعات شخصی</h2><p className="account-muted">اطلاعاتی که حساب نکسورای شما را معرفی می‌کند.</p><form className="account-form" onSubmit={save} aria-busy={busy}>
    <label>نام و نام خانوادگی<input autoComplete="name" value={name} required maxLength={100} onChange={e => setName(e.target.value)} /></label>
    <label>آدرس ایمیل<input dir="ltr" autoComplete="email" type="email" value={user.email} readOnly aria-describedby="account-email-note" /></label>
    <p id="account-email-note" className="account-muted">ایمیل، شناسهٔ ورود شماست و از این صفحه تغییر نمی‌کند.</p>
    {error && <p className="account-error" role="alert">{error}</p>}{message && <p className="account-success" role="status"><Check size={17} />{message}</p>}
    <button className="account-button" disabled={busy || !name.trim() || name.trim() === user.fullName}>{busy ? 'در حال ذخیره…' : 'ذخیرهٔ تغییرات'}</button>
  </form></section>;
}

function Security({ onLogout, busy }) {
  return <section className="account-panel"><span className="account-empty-icon"><ShieldCheck size={28} /></span><h2>امنیت و حریم خصوصی</h2><p className="account-muted">اطلاعات حساب، سفارش‌ها و علاقه‌مندی‌ها فقط پس از ورود به حساب شما قابل مشاهده‌اند.</p>
    <div className="account-security-row"><ShieldCheck size={20} /><div><h3>ورود امن به حساب</h3><p>اطلاعات ورود در کوکی امن نگه‌داری می‌شود و در اختیار کدهای صفحه قرار نمی‌گیرد.</p></div></div>
    <div className="account-security-row"><LogOut size={20} /><div><h3>از دستگاه مشترک استفاده می‌کنید؟</h3><p>پس از پایان کار از حساب خارج شوید تا نشست ورود این دستگاه بسته شود.</p></div></div>
    <button className="account-button danger" onClick={onLogout} disabled={busy}><LogOut size={17} />{busy ? 'در حال خروج…' : 'خروج از حساب کاربری'}</button>
  </section>;
}

export default function AccountPage() {
  const shop = useShop();
  const { user, isLoggedIn, authStatus, setIsAuthOpen, logout, cart, wishlist, accountStatus, refreshAccount, formatPrice, toPersianDigits, setIsCartOpen, setQuickViewProduct, toggleWishlist } = shop;
  const [section, setSection] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [ordersState, setOrdersState] = useState('loading');
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const content = useRef(null);
  useEffect(() => {
    if (!isLoggedIn) { setOrders([]); return; }
    const controller = new AbortController(); setOrdersState('loading');
    api('/account/orders', { signal: controller.signal }).then(data => {
      if (!Array.isArray(data)) throw new Error('Invalid orders');
      if (!controller.signal.aborted) { setOrders(data); setOrdersState('ready'); }
    }).catch(() => { if (!controller.signal.aborted) setOrdersState('error'); });
    return () => controller.abort();
  }, [isLoggedIn, user?.email, reload, cart.length]);
  const selectSection = key => {
    setSection(key);
    requestAnimationFrame(() => {
      content.current?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 767px)').matches) {
        content.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      }
    });
  };
  const leave = async () => { setBusy(true); try { await logout(); } catch { /* global error is displayed by logout */ } finally { setBusy(false); } };
  if (authStatus === 'loading') return <div className="account-page"><Loading /></div>;
  if (!isLoggedIn) return <div className="account-page"><section className="account-panel account-gate"><span className="account-empty-icon"><UserRound size={32} /></span><h1>حساب کاربری شما</h1><p>{authStatus === 'error' ? 'ارتباط با سرویس حساب برقرار نشد. دوباره تلاش کنید.' : 'برای دیدن اطلاعات، سفارش‌ها و علاقه‌مندی‌های خود وارد شوید.'}</p><button className="account-button" onClick={() => authStatus === 'error' ? window.location.reload() : setIsAuthOpen(true)}>{authStatus === 'error' ? 'تلاش مجدد' : 'ورود یا ساخت حساب'}</button><a href="/">بازگشت به فروشگاه</a></section></div>;
  const ready = accountStatus === 'ready';
  const orderReady = ordersState === 'ready';
  const renderOrders = (limit) => ordersState === 'loading' ? <Loading /> : ordersState === 'error' ? <Failure retry={() => setReload(reload + 1)} /> : orders.length ? <div className="account-orders">{orders.slice(0, limit).map(order => <OrderCard key={order.id} order={order} />)}</div> : <Empty title="هنوز سفارشی ثبت نکرده‌اید">اولین انتخاب هوشمندانهٔ شما از اینجا شروع می‌شود.</Empty>;
  return <div className="account-page" dir="rtl">
    <div className="account-breadcrumb"><a href="/">نکسورا</a><span>/</span><span>حساب کاربری</span><a href="/#trending" className="account-back">بازگشت به فروشگاه <ArrowUpLeft size={15} /></a></div>
    <section className="account-hero"><div className="account-hero-copy"><span className="account-eyebrow">فضای شخصی شما در نکسورا</span><h1>{user.fullName || 'همراه نکسورا'}، خوش آمدید</h1><p>انتخاب‌های شما، خریدهای شما، دنیای شما.</p><span className="account-private"><ShieldCheck size={15} />حساب شخصی و امن</span></div><div className="account-hero-art account-phone-art" aria-hidden="true"><img src={phoneImage} alt="" width="1280" height="1280" decoding="async" /></div></section>
    <div className="account-layout">
      <aside className="account-sidebar"><div className="account-identity"><span className="account-avatar">{(user.fullName || user.email).trim().slice(0, 1)}</span><div><strong>{user.fullName || 'حساب نکسورا'}</strong><span dir="ltr">{user.email}</span></div></div>
        <nav aria-label="بخش‌های حساب کاربری">{sections.map(([key, label, Icon]) => <button key={key} aria-label={label} onClick={() => selectSection(key)} aria-current={section === key ? 'page' : undefined} className={section === key ? 'active' : ''}><Icon size={19} /><span>{label}</span>{key === 'wishlist' && ready && wishlist.length > 0 && <small>{toPersianDigits(wishlist.length)}</small>}</button>)}</nav>
        <button className="account-logout" disabled={busy} onClick={leave}><LogOut size={18} />{busy ? 'در حال خروج…' : 'خروج از حساب'}</button>
      </aside>
      <div className="account-content" ref={content} tabIndex={-1} aria-label={sections.find(([key]) => key === section)?.[1]}>
        {section === 'overview' && <>
          <div className="account-stats">{[[Package, 'سفارش‌های شما', orderReady ? orders.length : null, 'orders'], [Heart, 'کالاهای مورد علاقه', ready ? wishlist.length : null, 'wishlist'], [ShoppingBag, 'کالاهای سبد خرید', ready ? shop.totalCartCount : null, 'cart']].map(([Icon, label, value, target]) => <button key={target} onClick={() => selectSection(target)}><span className={`account-stat-icon ${target}`}><Icon size={22} /></span><span><strong>{value === null ? '—' : toPersianDigits(value)}</strong><small>{label}</small></span><ArrowUpLeft size={17} /></button>)}</div>
          {!ready && (accountStatus === 'error' ? <Failure retry={() => refreshAccount().catch(() => {})} /> : <Loading />)}
          <section className="account-panel"><div className="account-section-heading"><div><h2>آخرین سفارش‌ها</h2><p>از ثبت سفارش تا آخرین وضعیت آن، همراه شما هستیم.</p></div><button onClick={() => selectSection('orders')}>مشاهدهٔ همه <ArrowUpLeft size={16} /></button></div>{renderOrders(3)}</section>
          <div className="account-bottom-grid"><section className="account-panel account-profile-preview"><UserRound size={22} /><h2>پروفایل شما</h2><p>{user.fullName || 'نام خود را تکمیل کنید'}</p><p className="account-email" dir="ltr">{user.email}</p><button className="account-text-button" onClick={() => selectSection('profile')}>ویرایش اطلاعات <ArrowUpLeft size={16} /></button></section><section className="account-panel account-help"><Headphones size={25} /><h2>خریدی با خیال راحت</h2><p>جزئیات سفارش را همین‌جا بررسی کنید. برای آشنایی با فروشگاه و راه‌های ارتباطی به بخش ارتباط با ما سر بزنید.</p><a className="account-text-button" href="/#footer">ارتباط با نکسورا <ArrowUpLeft size={16} /></a></section></div>
        </>}
        {section === 'orders' && <section className="account-panel"><div className="account-section-heading"><h2>سفارش‌های من</h2><button onClick={() => setReload(reload + 1)} disabled={ordersState === 'loading'}><RefreshCw size={16} />به‌روزرسانی</button></div>{renderOrders()}</section>}
        {(section === 'wishlist' || section === 'cart') && <section className="account-panel"><div className="account-section-heading"><h2>{section === 'cart' ? 'سبد خرید من' : 'علاقه‌مندی‌های من'}</h2>{section === 'cart' && cart.length > 0 && <button onClick={() => setIsCartOpen(true)}>مدیریت سبد <ArrowUpLeft size={16} /></button>}</div>
          {!ready ? accountStatus === 'error' ? <Failure retry={() => refreshAccount().catch(() => {})} /> : <Loading /> : !(section === 'wishlist' ? wishlist.length : cart.length) ? <Empty icon={section === 'wishlist' ? Heart : ShoppingBag} title={section === 'wishlist' ? 'لیست علاقه‌مندی‌های شما خالی است' : 'سبد خرید شما خالی است'}>کالاهایی که دوست دارید را در فروشگاه پیدا کنید.</Empty> : <div className="account-products">{(section === 'wishlist' ? wishlist.map(product => ({ product })) : cart).map(({ product, quantity }) => <article key={product.id} className="account-product"><button className="account-product-image" onClick={() => setQuickViewProduct(product)} aria-label={`مشاهدهٔ ${product.name}`}><img src={product.image} alt="" width="160" height="160" loading="lazy" decoding="async" /></button><h3>{product.name}</h3><strong>{formatPrice(product.price)}</strong>{quantity && <small>{toPersianDigits(quantity)} عدد در سبد خرید</small>}<div>{section === 'wishlist' ? <button onClick={() => toggleWishlist(product)} aria-label={`حذف ${product.name} از علاقه‌مندی‌ها`}><Heart size={16} />حذف از لیست</button> : <button onClick={() => setIsCartOpen(true)}>ویرایش تعداد</button>}<button onClick={() => setQuickViewProduct(product)}>مشاهده <ArrowUpLeft size={15} /></button></div></article>)}</div>}
          {section === 'cart' && ready && cart.length > 0 && <div className="account-cart-total"><span>جمع کالاها (بدون ارسال)</span><strong>{formatPrice(shop.cartSubtotal)}</strong><button className="account-button" onClick={() => setIsCartOpen(true)}>ادامهٔ سفارش <ArrowUpLeft size={17} /></button></div>}
        </section>}
        {section === 'profile' && <><Profile /><ChangePassword /></>}
        {section === 'security' && <Security onLogout={leave} busy={busy} />}
      </div>
    </div><p className="account-footnote"><ShieldCheck size={14} />اطلاعات این صفحه فقط برای حساب شما نمایش داده می‌شود.</p>
  </div>;
}
