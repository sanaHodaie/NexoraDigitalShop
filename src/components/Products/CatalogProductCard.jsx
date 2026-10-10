import React, { useState } from 'react';
import { ArrowUpLeft, Check, Heart, ShoppingBag } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export default function CatalogProductCard({ product, eager = false }) {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct, formatPrice, cart } = useShop();
  const [busy, setBusy] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const saved = isInWishlist(product.id);
  const inCart = cart.some(item => item.product.id === product.id);
  const perform = async (action, task) => {
    if (busy) return;
    setBusy(action);
    try { await task(product); } finally { setBusy(''); }
  };
  return <article className="catalog-card" aria-labelledby={`title-${product.id}`}>
    <div className="catalog-card-media">
      <button className="catalog-image-button" onClick={() => setQuickViewProduct(product)} aria-label={`مشاهده جزئیات ${product.name}`}>
        {imageFailed ? <span className="catalog-image-fallback">تصویر در دسترس نیست</span> : <img
          src={product.image} alt={product.name} width="480" height="360"
          loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setImageFailed(true)} />}
      </button>
      <span className={`catalog-stock ${product.inStock ? '' : 'catalog-stock-unavailable'}`}>
        <span aria-hidden="true" />{product.inStock ? 'موجود' : 'ناموجود'}
      </span>
      <button className={`catalog-wishlist ${saved ? 'is-saved' : ''}`} aria-pressed={saved}
        aria-label={`${saved ? 'حذف از' : 'افزودن به'} علاقه‌مندی‌ها: ${product.name}`} disabled={Boolean(busy)}
        onClick={() => perform('wishlist', toggleWishlist)}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>
    <div className="catalog-card-body">
      <div className="catalog-card-brand"><span dir="ltr">{product.brand}</span><span>{product.kindLabel}</span></div>
      <h2 id={`title-${product.id}`}><button onClick={() => setQuickViewProduct(product)}>{product.name}</button></h2>
      <p className="catalog-model" dir="ltr">{product.nameEn}</p>
      <ul className="catalog-specs">{product.specs.slice(0, 3).map(spec => <li key={spec}>{spec}</li>)}</ul>
      <div className="catalog-card-bottom">
        <span className="catalog-price-label">قیمت نمونه</span>
        <strong className="catalog-price">{formatPrice(product.price)}</strong>
        <div className="catalog-card-actions">
          <button className="catalog-add" disabled={!product.inStock || Boolean(busy)} onClick={() => perform('cart', addToCart)}
            aria-label={`افزودن ${product.name} به سبد خرید`}>
            {inCart ? <Check size={17} /> : <ShoppingBag size={17} />}
            <span>{busy === 'cart' ? 'در حال افزودن…' : !product.inStock ? 'ناموجود' : inCart ? 'افزودن دوباره' : 'افزودن به سبد'}</span>
          </button>
          <button className="catalog-detail" onClick={() => setQuickViewProduct(product)} aria-label={`جزئیات ${product.name}`}><ArrowUpLeft size={20} /></button>
        </div>
      </div>
    </div>
  </article>;
}
