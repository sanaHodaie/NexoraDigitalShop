import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X, ArrowUpLeft } from 'lucide-react';
import { optimizedImage } from '../../data/imageAssets';
import { useShop } from '../../context/ShopContext';
import { buildSearchIndex, normalizeSearch, suggestProducts } from '../../lib/product-search';
import './search.css';

export const SearchBar = ({ className = '', products, value, onChange, onSelect, onDismiss, autoFocus = false, placeholder = 'نام محصول، مدل یا برند…' }) => {
  const { allProducts, productsStatus, reloadProducts, setQuickViewProduct, formatPrice } = useShop();
  const [localQuery, setLocalQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef(null);
  const input = useRef(null);
  const id = useId();
  const query = value ?? localQuery;
  const index = useMemo(() => buildSearchIndex(products ?? allProducts), [products, allProducts]);
  const suggestions = useMemo(() => suggestProducts(index, query), [index, query]);
  const visible = open && Boolean(normalizeSearch(query));
  const activeOption = active >= 0 ? suggestions[active] : undefined;
  const update = text => { setLocalQuery(text); onChange?.(text); setActive(-1); setOpen(true); };
  const select = product => {
    update(product.name);
    setOpen(false);
    setQuickViewProduct(product);
    onSelect?.(product);
  };

  useEffect(() => {
    const outside = event => {
      if (!root.current?.contains(event.target)) { setOpen(false); setActive(-1); }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => {
    if (visible && activeOption) document.getElementById(`${id}-${activeOption.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeOption, visible, id]);

  const keyDown = event => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1); onDismiss?.();
    } else if (['ArrowDown', 'ArrowUp'].includes(event.key) && suggestions.length) {
      event.preventDefault(); setOpen(true);
      setActive(previous => event.key === 'ArrowDown'
        ? (previous + 1) % suggestions.length
        : previous <= 0 ? suggestions.length - 1 : previous - 1);
    } else if (event.key === 'Enter' && visible && suggestions.length) {
      event.preventDefault(); select(activeOption || suggestions[0]);
    } else if (event.key === 'Tab') { setOpen(false); setActive(-1); }
  };
  const status = productsStatus === 'loading' && !index.length ? 'در حال دریافت محصولات…'
    : productsStatus === 'error' && !index.length ? 'دریافت محصولات انجام نشد.'
      : suggestions.length ? `${new Intl.NumberFormat('fa-IR').format(suggestions.length)} پیشنهاد؛ با کلیدهای بالا و پایین انتخاب کنید.`
        : 'محصولی پیدا نشد؛ نام یا مدل دیگری را امتحان کنید.';

  return <div ref={root} className={`product-search ${className}`} dir="rtl" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1); }
  }}>
    <div className="product-search-field">
      <Search size={17} aria-hidden="true" />
      <input ref={input} type="text" role="combobox" autoFocus={autoFocus} autoComplete="off" spellCheck={false}
        maxLength={100} value={query} onChange={event => update(event.target.value)} onFocus={() => {
          setOpen(true);
          if (!allProducts.length && productsStatus === 'loading') reloadProducts();
        }} onKeyDown={keyDown} placeholder={placeholder} aria-label={placeholder}
        aria-autocomplete="list" aria-expanded={visible} aria-controls={visible ? `${id}-list` : undefined}
        aria-activedescendant={visible && activeOption ? `${id}-${activeOption.id}` : undefined} />
      {query && <button type="button" aria-label="پاک کردن جست‌وجو" onClick={() => { update(''); input.current?.focus(); }}><X size={15} /></button>}
    </div>
    {visible && <div className="product-search-popup">
      <p className="product-search-caption">پیشنهاد محصولات <span>انتخاب و مشاهده</span></p>
      <div role="listbox" id={`${id}-list`} aria-label="محصولات پیشنهادی" className="product-search-list">
        {suggestions.map((product, position) => <button key={product.id} type="button" role="option"
          id={`${id}-${product.id}`} aria-selected={position === active} tabIndex={-1}
          onMouseDown={event => event.preventDefault()} onPointerMove={() => setActive(position)} onClick={() => select(product)}>
          <img src={optimizedImage(product.image)} alt="" width="48" height="48" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          <span className="product-search-copy"><strong>{product.name}</strong><small>{product.categoryFa || product.brand}</small><b>{product.inStock === false ? 'ناموجود' : formatPrice(product.price)}</b></span>
          <ArrowUpLeft size={15} aria-hidden="true" />
        </button>)}
      </div>
      <p className="product-search-status" role="status" aria-live="polite">{status}</p>
      {productsStatus === 'error' && !index.length && <button type="button" className="product-search-retry" onClick={reloadProducts}>تلاش مجدد</button>}
    </div>}
  </div>;
};
