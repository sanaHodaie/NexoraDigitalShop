import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useShop } from '../context/ShopContext';
import InvoiceView from '../components/Orders/InvoiceView';
import './checkout.css';

const emptyAddress = { recipient: '', phone: '', province: '', city: '', postalCode: '', address: '', building: '', unit: '', notes: '' };
const fields = [ ['recipient','نام و نام خانوادگی تحویل‌گیرنده','name',100], ['phone','شمارهٔ موبایل','tel',11], ['province','استان','address-level1',60], ['city','شهر','address-level2',60], ['postalCode','کد پستی ده‌رقمی','postal-code',10], ['building','پلاک','off',20], ['unit','واحد (اختیاری)','off',20] ];

export default function CheckoutPage() {
  const { user, isLoggedIn, authStatus, accountStatus, setIsAuthOpen, cart, cartSubtotal, formatPrice, refreshAccount } = useShop();
  const [params, setParams] = useSearchParams();
  const id = /^\d+$/.test(params.get('invoice') || '') ? params.get('invoice') : null;
  const [address, setAddress] = useState(emptyAddress);
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => { setAddress(a => ({ ...a, recipient: a.recipient || user?.fullName || '' })); }, [user?.fullName]);
  useEffect(() => { setInvoice(null); }, [id, user?.email]);
  const preview = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await refreshAccount();
      const data = await api('/account/invoices', { method:'POST', body:JSON.stringify({shippingAddress:address}) });
      setParams({invoice:String(data.id)});
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const data = await api(`/account/orders/${id}/submit`, {method:'POST',body:JSON.stringify({priceRevision:invoice.priceRevision})});
      setInvoice(value => ({...value,...data})); setVersion(v => v + 1);
      await refreshAccount();
    } catch (e) { setError(e.message); if(e.code==='PRICE_CHANGED'){setVersion(v=>v+1);await refreshAccount().catch(()=>{});} }
    finally { setBusy(false); }
  };
  if (authStatus === 'loading') return <div className="checkout-page" role="status">در حال دریافت حساب…</div>;
  if (!isLoggedIn) return <section className="checkout-page"><h1>تکمیل خرید</h1><p>برای ثبت آدرس و دریافت فاکتور وارد حساب خود شوید.</p><button className="checkout-primary" onClick={() => setIsAuthOpen(true)}>ورود به حساب</button></section>;
  if (!id && accountStatus !== 'ready') return <section className="checkout-page" role="status">{accountStatus === 'error' ? <button className="checkout-primary" onClick={() => refreshAccount().catch(e => setError(e.message))}>دریافت دوبارهٔ سبد خرید</button> : 'در حال دریافت سبد خرید…'}{error && <p role="alert">{error}</p>}</section>;
  return <div className="checkout-page" dir="rtl"><Link to="/account">حساب کاربری ←</Link><h1>آدرس، فاکتور و ثبت سفارش</h1><p className="checkout-intro">ابتدا مشخصات تحویل را ثبت کنید، پیش‌فاکتور را بررسی و سپس سفارش را نهایی کنید.</p>
    {error && <p role="alert" className="checkout-error">{error}</p>}
    {id ? <><InvoiceView key={`${id}-${user.email}`} id={id} onUpdate={setInvoice} version={version}/>{(!invoice || invoice.status === 'draft') && <div className="checkout-actions"><button className="checkout-primary" disabled={busy||!invoice} onClick={submit}>{busy ? 'در حال ثبت…' : 'تأیید و ثبت سفارش در صف پرداخت'}</button><button disabled={busy} onClick={() => { setAddress(invoice?.shippingAddress || address); setParams({}); setError(''); }}>ویرایش آدرس یا دریافت پیش‌فاکتور جدید</button></div>}{invoice?.status === 'pending_payment' && <p className="checkout-info">سفارش ثبت شد. درگاه پرداخت آنلاین هنوز متصل نیست؛ تأیید پرداخت فقط پس از بررسی دریافت مبلغ توسط مدیریت انجام می‌شود.</p>}<Link className="checkout-account" to="/account">مشاهدهٔ سفارش‌ها در حساب کاربری</Link></> : !cart.length ? <p>سبد خرید خالی است. <Link to="/">بازگشت به فروشگاه</Link></p> : <div className="checkout-layout"><form onSubmit={preview} className="checkout-form"><h2>مشخصات گیرنده و نشانی</h2><div className="checkout-fields">{fields.map(([key,label,auto,max]) => <label key={key}><span>{label}</span><input name={key} autoComplete={auto} required={key !== 'unit'} maxLength={max} minLength={key === 'recipient' ? 3 : ['city','province'].includes(key) ? 2 : 1} inputMode={['phone','postalCode'].includes(key) ? 'numeric' : 'text'} pattern={key === 'phone' ? '[0۰٠][9۹٩][0-9۰-۹٠-٩]{9}' : key === 'postalCode' ? '[0-9۰-۹٠-٩]{10}' : undefined} value={address[key]} onChange={e => setAddress(a => ({...a,[key]:e.target.value}))}/></label>)}</div><label><span>آدرس کامل؛ خیابان، کوچه و ساختمان</span><textarea name="address" autoComplete="street-address" required minLength={10} maxLength={500} rows={3} value={address.address} onChange={e => setAddress(a => ({...a,address:e.target.value}))}/></label><label><span>توضیحات تحویل (اختیاری)</span><textarea name="notes" maxLength={300} rows={2} value={address.notes} onChange={e => setAddress(a => ({...a,notes:e.target.value}))}/></label><button className="checkout-primary" disabled={busy}>{busy ? 'در حال ایجاد پیش‌فاکتور…' : 'ثبت مشخصات و دریافت پیش‌فاکتور'}</button></form><aside className="checkout-summary"><h2>خلاصهٔ سبد خرید</h2>{cart.map(({product,quantity}) => <p key={product.id}><span>{product.name} × {quantity.toLocaleString('fa-IR')}</span><b>{formatPrice(product.price*quantity)}</b></p>)}<p><span>ارسال</span><b>{cartSubtotal >= 99 ? 'رایگان' : formatPrice(9.99)}</b></p><p><span>جمع تقریبی</span><b>{formatPrice(cartSubtotal + (cartSubtotal>=99 ? 0 : 9.99))}</b></p><small>مبلغ قطعی از قیمت‌های ثبت‌شدهٔ فروشگاه در پیش‌فاکتور محاسبه می‌شود.</small></aside></div>}
  </div>;
}
