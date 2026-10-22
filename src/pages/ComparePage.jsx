import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Columns3, Plus, RefreshCw, Search, ShoppingBag, X } from 'lucide-react';
import { useCompare } from '../context/CompareContext';
import { useShop } from '../context/ShopContext';
import { useContent } from '../context/ContentContext';
import { optimizedImage } from '../data/imageAssets';
import { buildSearchIndex, suggestProducts } from '../lib/product-search';
import { comparisonRows } from '../lib/comparison';
import '../components/Products/compare.css';

export default function ComparePage() {
  const { ids, products, add, replace, remove, clear, error, dismiss } = useCompare();
  const { allProducts, productsStatus, productsRefreshError, productsStale, reloadProducts, formatPrice, toPersianDigits, setQuickViewProduct, addToCart } = useShop();
  const { categories } = useContent();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [replaceId, setReplaceId] = useState('');
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [busy, setBusy] = useState('');
  const picker = useRef(null);
  const field = useRef(null);
  const activeCategory = products.find(product => product.id !== replaceId)?.category || category;
  const candidates = useMemo(() => allProducts.filter(product => !ids.includes(product.id)
    && (!activeCategory || product.category === activeCategory)), [allProducts, ids, activeCategory]);
  const index = useMemo(() => buildSearchIndex(candidates), [candidates]);
  const suggestions = useMemo(() => query.trim() ? suggestProducts(index, query, 6) : candidates.slice(0, 6), [index, query, candidates]);
  const rows = useMemo(() => comparisonRows(products), [products]);
  const priceDiffers = new Set(products.map(product => product.price)).size > 1;
  const stockDiffers = new Set(products.map(product => product.inStock)).size > 1;
  const showPicker = ids.length < 3 || Boolean(replaceId);
  const visibleRows = rows.filter(row => !onlyDifferences || row.different);

  useEffect(() => {
    const title = document.title;
    document.title = 'مقایسه محصولات | نکسورا';
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex, follow';
    document.head.appendChild(robots);
    return () => { document.title = title; robots.remove(); };
  }, []);
  useEffect(() => {
    if (replaceId && !ids.includes(replaceId)) setReplaceId('');
  }, [ids, replaceId]);
  useEffect(() => { if (products.length < 2) setOnlyDifferences(false); }, [products.length]);
  const choose = product => {
    if (replaceId) replace(replaceId, product); else add(product);
    setReplaceId(''); setQuery('');
  };
  const startReplace = id => { setReplaceId(id); setQuery(''); };
  useEffect(() => {
    if (replaceId) { picker.current?.scrollIntoView({ block: 'center' }); field.current?.focus({ preventScroll: true }); }
  }, [replaceId]);
  const cart = async product => {
    setBusy(product.id);
    try { await addToCart(product); } finally { setBusy(''); }
  };

  return <section className="compare-page" dir="rtl">
    <Link className="compare-back" to={products[0] ? `/category/${products[0].category}` : '/'}><ArrowRight size={16}/>بازگشت به فروشگاه</Link>
    <header className="compare-heading"><div><span className="compare-eyebrow"><Columns3 size={17}/>انتخاب آگاهانه‌تر</span><h1>کنار هم ببین، راحت‌تر انتخاب کن</h1><p>حداکثر ۳ محصول از یک دسته را با قیمت و مشخصات ثبت‌شدهٔ فروشگاه مقایسه کن.</p></div><span className="compare-count">{toPersianDigits(ids.length)} / ۳</span></header>
    {error && <p className="compare-message" role="alert">{error}<button onClick={dismiss} aria-label="بستن پیام"><X size={16}/></button></p>}
    {productsStatus === 'loading' && <p role="status" className="compare-message">در حال دریافت مشخصات محصولات…</p>}
    {(productsStatus === 'error' || productsRefreshError) && <p className="compare-message" role="status">دریافت آخرین اطلاعات انجام نشد. <button onClick={reloadProducts}>تلاش مجدد</button></p>}
    {productsStale && products.length > 0 && <p className="compare-disclaimer">اطلاعات ذخیره‌شده نمایش داده می‌شود؛ قیمت و موجودی هنگام خرید دوباره بررسی می‌شوند.</p>}

    <div className="compare-selected">{Array.from({ length: 3 }, (_, position) => {
      const id = ids[position];
      const product = products.find(item => item.id === id);
      return product ? <article className="compare-product" key={id}>
        <button className="compare-remove" onClick={() => remove(id)} aria-label={`حذف ${product.name} از مقایسه`}><X size={18}/></button>
        <button className="compare-photo" onClick={() => setQuickViewProduct(product)} aria-label={`جزئیات ${product.name}`}><img src={optimizedImage(product.image)} alt={product.name} width="240" height="180" decoding="async"/></button>
        <span className="compare-product-brand">{product.brand || categories[product.category]?.title}</span><h2>{product.name}</h2><p className="compare-model" dir="ltr">{product.nameEn}</p>
        <strong className="compare-product-price">{formatPrice(product.price)}</strong>
        <div className="compare-product-actions"><button className="compare-primary" disabled={!product.inStock || Boolean(busy)} onClick={() => cart(product)}><ShoppingBag size={16}/>{!product.inStock ? 'ناموجود' : busy === id ? 'در حال افزودن…' : 'افزودن به سبد'}</button><button onClick={() => startReplace(id)} aria-label={`جایگزینی ${product.name}`}><RefreshCw size={16}/>جایگزینی</button></div>
      </article> : id ? <article className="compare-slot" key={id}><p>{productsStatus === 'loading' ? 'در حال بارگذاری…' : 'این محصول در کاتالوگ فعلی نیست.'}</p><button onClick={() => remove(id)}>حذف از فهرست</button></article>
        : <button className="compare-slot" key={`empty-${position}`} onClick={() => { picker.current?.scrollIntoView({ block: 'center' }); field.current?.focus({ preventScroll: true }); }}><Plus size={26}/><b>افزودن محصول {toPersianDigits(position + 1)}</b><span>از فهرست زیر انتخاب کن</span></button>;
    })}</div>

    {showPicker && <section ref={picker} className="compare-picker" aria-label="انتخاب محصول برای مقایسه">
      <div className="compare-section-heading"><h2>{replaceId ? 'انتخاب محصول جایگزین' : 'محصول بعدی را انتخاب کن'}</h2>{replaceId && <button onClick={() => setReplaceId('')}>انصراف از جایگزینی</button>}</div>
      <div className="compare-picker-filters"><label className="compare-search"><Search size={18}/><input ref={field} value={query} onChange={event => setQuery(event.target.value)} placeholder="جست‌وجوی نام، مدل یا برند…" aria-label="جست‌وجوی محصول برای مقایسه" maxLength={100}/></label>
        {!products.some(product => product.id !== replaceId) ? <label className="compare-category-label">دسته‌بندی<select value={category} onChange={event => { setCategory(event.target.value); setQuery(''); }}><option value="">همه دسته‌ها</option>{Object.entries(categories).map(([id, item]) => <option key={id} value={id}>{item.title}</option>)}</select></label>
          : <span className="compare-category-tag">{categories[activeCategory]?.title || 'هم‌دسته با محصول انتخاب‌شده'}</span>}
      </div>
      <div className="compare-picker-results">{suggestions.map(product => <button key={product.id} onClick={() => choose(product)} aria-label={`انتخاب ${product.name} برای مقایسه`}><img src={optimizedImage(product.image)} alt="" width="48" height="48" loading="lazy"/><span><b>{product.name}</b><small>{formatPrice(product.price)}{product.inStock === false ? ' · ناموجود' : ''}</small></span><Plus size={18}/></button>)}</div>
      {!suggestions.length && productsStatus === 'ready' && <p role="status" className="compare-disclaimer">محصول دیگری پیدا نشد؛ عبارت جست‌وجو را تغییر بده.</p>}
    </section>}

    {products.length > 0 && <section className="compare-details" aria-label="جدول مقایسه مشخصات">
      <div className="compare-section-heading"><h2>تفاوت‌ها در یک نگاه</h2><label><input type="checkbox" checked={onlyDifferences} disabled={products.length < 2} onChange={event => setOnlyDifferences(event.target.checked)}/>فقط تفاوت‌ها</label><button onClick={() => { clear(); setOnlyDifferences(false); setReplaceId(''); }}>پاک کردن مقایسه</button></div>
      {products.length < 2 && <p className="compare-disclaimer">برای مقایسه، حداقل یک محصول دیگر انتخاب کن.</p>}
      <p id="compare-scroll-help" className="compare-disclaimer">در صفحهٔ کوچک، جدول را به چپ و راست بکش. «ثبت نشده» به معنی نبود آن قابلیت نیست.</p>
      <div className="compare-table-scroll" tabIndex={0} role="region" aria-label="جدول قابل پیمایش مقایسه" aria-describedby="compare-scroll-help"><table><caption className="sr-only">مقایسهٔ قیمت، موجودی و مشخصات محصولات انتخاب‌شده</caption><thead><tr><th scope="col">مشخصات</th>{products.map(product => <th scope="col" key={product.id}>{product.name}</th>)}</tr></thead><tbody>
        {(!onlyDifferences || priceDiffers) && <tr className={priceDiffers ? 'compare-difference' : ''}><th scope="row">قیمت</th>{products.map(product => <td key={product.id}>{formatPrice(product.price)}</td>)}</tr>}
        {(!onlyDifferences || stockDiffers) && <tr className={stockDiffers ? 'compare-difference' : ''}><th scope="row">موجودی</th>{products.map(product => <td key={product.id}>{product.inStock ? 'موجود' : 'ناموجود'}</td>)}</tr>}
        {visibleRows.map(row => <tr key={row.key} className={row.different ? 'compare-difference' : ''}><th scope="row">{row.label}</th>{row.values.map((value, i) => <td key={products[i].id}>{value || <span className="compare-missing">ثبت نشده</span>}</td>)}</tr>)}
      </tbody></table></div>
      {onlyDifferences && !visibleRows.length && !priceDiffers && !stockDiffers && <p role="status" className="compare-disclaimer">در اطلاعات ثبت‌شده تفاوتی پیدا نشد.</p>}
      <p className="compare-disclaimer">مقایسه فقط بر اساس اطلاعات ثبت‌شده است؛ مشخصات نامشخص تخمین زده نمی‌شوند. قیمت محصولات نمونه ممکن است با قیمت فروش واقعی متفاوت باشد.</p>
    </section>}
  </section>;
}
