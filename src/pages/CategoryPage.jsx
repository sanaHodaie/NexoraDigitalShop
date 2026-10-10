import React, { useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, Gamepad2, Headphones, Laptop, Search, Smartphone, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { CATALOG_CATEGORIES, selectCatalogProducts } from '../data/catalog';
import CatalogProductCard from '../components/Products/CatalogProductCard';
import CategoryHeroArt from '../components/Categories/CategoryHeroArt';
import CatalogSort from '../components/Categories/CatalogSort';
import './catalog.css';

export default function CategoryPage() {
  const { categoryId } = useParams();
  const [params, setParams] = useSearchParams();
  const category = CATALOG_CATEGORIES[categoryId];
  const { allProducts, productsStatus, reloadProducts, toPersianDigits } = useShop();
  const query = params.get('q') || '';
  const brand = params.get('brand') || '';
  const sort = ['price-asc', 'price-desc'].includes(params.get('sort')) ? params.get('sort') : 'featured';
  const available = params.get('available') === '1';
  const update = (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  }, { replace: true });
  const collection = useMemo(() => selectCatalogProducts(allProducts, categoryId), [allProducts, categoryId]);
  const products = useMemo(() => selectCatalogProducts(allProducts, categoryId, { query, brand, sort, available }), [allProducts, categoryId, query, brand, sort, available]);
  const brands = [...new Set(collection.map(product => product.brand).filter(Boolean))];
  const filtered = Boolean(query || brand || available);

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute('content');
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = `${window.location.origin}/category/${categoryId}`;
    document.head.appendChild(canonical);
    document.title = category ? `${category.title} | فروشگاه نکسورا` : 'دسته‌بندی پیدا نشد | نکسورا';
    if (category) description?.setAttribute('content', category.description);
    return () => {
      document.title = previousTitle;
      if (previousDescription !== null && previousDescription !== undefined) description?.setAttribute('content', previousDescription);
      canonical.remove();
    };
  }, [category, categoryId]);

  if (!category) return <section className="catalog-page catalog-empty" dir="rtl"><h1>این دسته‌بندی پیدا نشد</h1><Link to="/">بازگشت به خانه</Link></section>;
  const Icon = { smartphones: Smartphone, laptops: Laptop, audio: Headphones, gaming: Gamepad2 }[categoryId];
  return <div className="catalog-page" dir="rtl">
    <nav className="catalog-breadcrumb" aria-label="مسیر صفحه"><Link to="/">خانه</Link><ChevronLeft size={14} aria-hidden="true" /><span aria-current="page">{category.title}</span></nav>
    <header className="catalog-hero">
      <div className="catalog-hero-copy">
        <span className="catalog-eyebrow"><Icon size={15} /><span dir="ltr">{category.english}</span></span>
        <h1>{category.title}<span>انتخاب بعدی تو، همین‌جاست</span></h1>
        <p>{category.description}</p>
        <nav className="catalog-switch" aria-label="دسته‌بندی محصولات">
          <Link to={`/category/${categoryId}`} aria-current="page">{category.title}<ArrowLeft size={14} /></Link>
        </nav>
      </div>
      <CategoryHeroArt key={categoryId} category={category} />
    </header>

    <section aria-label="فهرست محصولات">
      <div className="catalog-toolbar">
        <label className="catalog-search"><Search size={19} aria-hidden="true" /><input type="search" value={query} onChange={event => update('q', event.target.value)} placeholder="جست‌وجو در این دسته…" aria-label="جست‌وجو در این دسته" maxLength={100} /></label>
        <CatalogSort key={categoryId} value={sort} onChange={value => update('sort', value === 'featured' ? '' : value)} />
      </div>
      <div className="catalog-filters">
        <div className="catalog-brands" role="group" aria-label="فیلتر برند">
          <button aria-pressed={!brand} onClick={() => update('brand', '')}>همه برندها</button>
          {brands.map(value => <button key={value} aria-pressed={brand === value} onClick={() => update('brand', value)} dir="ltr">{value}</button>)}
        </div>
        <label className="catalog-available"><input type="checkbox" checked={available} onChange={event => update('available', event.target.checked ? '1' : '')} />فقط موجودها</label>
      </div>
      <div className="catalog-results-line">
        <p role="status" aria-live="polite">{productsStatus === 'loading' ? 'در حال دریافت محصولات…' : productsStatus === 'ready' ? `${toPersianDigits(products.length)} محصول${filtered ? ` از ${toPersianDigits(collection.length)}` : ' منتخب'}` : 'دریافت محصولات انجام نشد'}</p>
        {filtered && <button onClick={() => setParams({}, { replace: true })}><X size={14} />پاک کردن فیلترها</button>}
      </div>
      {productsStatus === 'loading' ? <div className="catalog-grid" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <div className="catalog-skeleton" key={i}><div /><span /><span /></div>)}</div>
        : productsStatus === 'error' ? <div className="catalog-empty"><h2>محصولات بارگذاری نشدند</h2><p>اتصال به فروشگاه را بررسی کنید و دوباره تلاش کنید.</p><button onClick={reloadProducts}>تلاش مجدد</button></div>
          : products.length === 0 ? <div className="catalog-empty"><Search size={32} /><h2>{filtered ? 'محصولی با این مشخصات پیدا نشد' : 'محصولات این مجموعه به‌زودی اضافه می‌شوند'}</h2><p>{filtered ? 'عبارت جست‌وجو یا برند انتخاب‌شده را تغییر دهید.' : 'کمی بعد دوباره به این صفحه سر بزنید.'}</p>{filtered && <button onClick={() => setParams({}, { replace: true })}>نمایش همه محصولات</button>}</div>
            : <div className="catalog-grid">{products.map((product, index) => <CatalogProductCard key={product.id} product={product} eager={index < 4} />)}</div>}
      <p className="catalog-demo-note">این مجموعه برای تست فروشگاه است؛ قیمت‌ها و پیکربندی‌ها نمونه‌اند و تصاویر، نمایشی هستند.</p>
      {categoryId === 'gaming' && <p className="catalog-demo-note">عکس کنسول هیرو: <a href="https://commons.wikimedia.org/wiki/File:PlayStation_5_and_DualSense_with_transparent_background.png" target="_blank" rel="noreferrer">Osh33m / Soberian</a>؛ ویرایش زاویه و ترکیب کنسول و کنترلر، با مجوز <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></p>}
    </section>
  </div>;
}
