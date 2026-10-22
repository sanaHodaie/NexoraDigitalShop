import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Columns3, X } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import { useShop } from '../../context/ShopContext';
import { optimizedImage } from '../../data/imageAssets';
import './compare.css';

export default function CompareTray() {
  const { ids, products, error, dismiss, remove, clear } = useCompare();
  const { isCartOpen, isAuthOpen, isWishlistModalOpen, quickViewProduct, toPersianDigits } = useShop();
  const { pathname } = useLocation();
  if (!ids.length || pathname.startsWith('/compare') || pathname.startsWith('/checkout')) return null;
  if (isCartOpen || isAuthOpen || isWishlistModalOpen) return null;
  return <>
    {error && <div className="compare-alert" role="alert"><span>{error}</span><button onClick={dismiss} aria-label="بستن پیام مقایسه"><X size={18}/></button></div>}
    {!quickViewProduct && <aside className="compare-tray" dir="rtl" aria-label="فهرست مقایسه">
      <div className="compare-tray-title"><Columns3 size={20}/><span>{toPersianDigits(ids.length)} از ۳ محصول</span></div>
      <div className="compare-tray-products">{ids.map(id => {
        const product = products.find(item => item.id === id);
        return <div key={id}>{product && <img src={optimizedImage(product.image)} alt={product.name} width="40" height="40"/>}
          <button onClick={() => remove(id)} aria-label={`حذف از مقایسه: ${product?.name || id}`}><X size={13}/></button>
        </div>;
      })}</div>
      <Link to="/compare" className="compare-primary">{ids.length < 2 ? 'انتخاب محصول بعدی' : 'مقایسه محصولات'}</Link>
      <button className="compare-tray-clear" onClick={clear} aria-label="پاک کردن فهرست مقایسه"><X size={18}/></button>
    </aside>}
  </>;
}
