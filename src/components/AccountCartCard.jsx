import React from 'react';
import { ArrowUpLeft, PackageCheck, Pencil, ShoppingBag, Trash2, Truck } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import './account-cart-card.css';

export function AccountCartCard({ product, quantity }) {
  const { formatPrice, toPersianDigits, cartSubtotal, setQuickViewProduct, setIsCartOpen, removeFromCart } = useShop();
  const specs = Array.isArray(product.specs) ? product.specs.filter(spec => typeof spec === 'string' && spec.trim()) : [];
  return <article className="account-product user-cart-card">
    <section className="user-cart-visual">
      <button className="account-product-image user-cart-image" onClick={() => setQuickViewProduct(product)} aria-label={`مشاهدهٔ ${product.name}`}>
        <img src={product.image} alt={product.name} width="400" height="400" loading="lazy" decoding="async" />
      </button>
      <span className="user-cart-price">{formatPrice(product.price)}</span>
    </section>
    <p className="user-cart-shipping"><Truck size={15} /><span>{cartSubtotal >= 99 ? 'ارسال رایگان برای این سفارش' : 'هزینهٔ ارسال در جمع سبد محاسبه می‌شود'}</span></p>
    <header className="user-cart-heading"><h3>{product.name}</h3><button onClick={() => setIsCartOpen(true)}>ادامهٔ خرید <ArrowUpLeft size={14} /></button></header>
    <footer className="user-cart-tiles">
      <span><ShoppingBag size={21} /><b>{toPersianDigits(quantity)} عدد</b></span>
      <span><PackageCheck size={21} /><b>{product.inStock === false ? 'ناموجود' : 'موجود'}</b></span>
      <button onClick={() => setIsCartOpen(true)} aria-label={`ویرایش تعداد ${product.name}`}><Pencil size={21} /><b>ویرایش</b></button>
      <button onClick={() => removeFromCart(product.id)} aria-label={`حذف ${product.name} از سبد خرید`}><Trash2 size={21} /><b>حذف کالا</b></button>
    </footer>
    <section className="user-cart-specs" aria-label="مشخصات محصول">
      <h4>مشخصات محصول</h4>
      {specs.length ? <ul>{specs.map((spec, index) => <li key={index}>{spec}</li>)}</ul> : <p>مشخصات این محصول هنوز ثبت نشده است.</p>}
    </section>
  </article>;
}
