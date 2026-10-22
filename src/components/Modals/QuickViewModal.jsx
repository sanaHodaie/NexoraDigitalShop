import { optimizedImage } from '../../data/imageAssets';
import React, { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag, Check, Shield, Truck, RotateCcw, Star } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { CloseIcon } from '../../assets/icons/CloseIcon';
import './quick-view.css';
import CompareButton from '../Products/CompareButton';

const mobileQuery = '(max-width: 767px)';
const subscribeMobile = callback => {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = callback => {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};

export const QuickViewModal = () => {
  const { quickViewProduct } = useShop();
  return createPortal(
    <AnimatePresence>
      {quickViewProduct && <QuickViewDialog key={quickViewProduct.id} quickViewProduct={quickViewProduct} />}
    </AnimatePresence>, document.body
  );
};

function QuickViewDialog({ quickViewProduct }) {
  const { setQuickViewProduct, addToCart, toggleWishlist, isInWishlist, formatPrice, toPersianDigits } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const dialog = useRef(null);
  const addedTimer = useRef(null);
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(mobileQuery).matches, () => false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(reducedMotionQuery).matches, () => false);

  useLayoutEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.querySelector('button').focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      clearTimeout(addedTimer.current);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  const handleKeyDown = event => {
    if (event.key === 'Escape') { event.stopPropagation(); setQuickViewProduct(null); }
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const isFavorited = isInWishlist(quickViewProduct.id);

  const handleAddToCart = () => {
    addToCart(quickViewProduct, quantity);
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 2000);
  };

  return (
      <motion.div className="quick-view-layer fixed inset-0 z-50 font-vazir" dir="rtl"
        initial="hidden" animate="visible" exit="hidden">
        {/* Backdrop */}
        <motion.div
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          transition={{ duration: reducedMotion ? 0 : 0.25 }}
          onClick={() => setQuickViewProduct(null)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Dialog: Designed so image occupies the ENTIRE RIGHT SIDE (in RTL), and info on the left side */}
        <motion.div
          ref={dialog} role="dialog" aria-modal="true" aria-labelledby="quick-view-title" onKeyDown={handleKeyDown}
          variants={{
            hidden: reducedMotion ? { opacity: 0, scale: 1, y: 0 } : { opacity: mobile ? 1 : 0, scale: mobile ? 1 : 0.96, y: mobile ? '100%' : 16 },
            visible: { opacity: 1, scale: 1, y: 0 },
          }}
          transition={{ duration: reducedMotion ? 0 : mobile ? 0.38 : 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="quick-view-panel relative w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10"
        >
          <div className="quick-view-handle" aria-hidden="true"><span className="bg-slate-300 dark:bg-slate-600" /></div>
          {/* Close button (top-left) */}
          <button
            type="button" aria-label="بستن جزئیات محصول"
            onClick={() => setQuickViewProduct(null)}
            className="absolute top-4 left-4 z-30 w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-colors flex items-center justify-center p-1.5 cursor-pointer shadow-md"
          >
            <CloseIcon className="w-4 h-4" />
          </button>

          <div className="quick-view-scroll">
          <div className="flex flex-col md:flex-row items-stretch">
            {/* PRODUCT IMAGE: Occupies the FULL RIGHT SIDE (in RTL) */}
            <div className="quick-view-image relative w-full md:w-1/2 md:min-h-[460px] bg-white overflow-hidden flex items-center justify-center">
              <img
                src={optimizedImage(quickViewProduct.image)}
                alt={quickViewProduct.name}
                className="absolute inset-0 w-full h-full object-contain select-none"
                referrerPolicy="no-referrer"
              />

              {/* Wishlist Heart toggle on top-right of image */}
              <button
                type="button"
                aria-label="علاقه‌مندی محصول" aria-pressed={isFavorited}
                onClick={() => toggleWishlist(quickViewProduct)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-500 transition-all cursor-pointer shadow-md"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFavorited ? 'fill-rose-500 text-rose-500 stroke-none' : ''
                  }`}
                />
              </button>

              {/* Discount / Category Badge on bottom-right of image */}
              <div className="absolute bottom-4 right-4 z-20">
                <span className="px-3.5 py-1 rounded-full bg-blue-600 text-white text-xs font-black font-vazir shadow-lg">
                  {quickViewProduct.categoryFa || 'کالای منتخب'}
                </span>
              </div>
            </div>

            {/* PRODUCT INFORMATION: Left side in RTL, strictly right-aligned text */}
            <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between text-right bg-white dark:bg-slate-900">
              <div className="space-y-3">
                {/* Title + Verified Badge */}
                <div className="flex items-center justify-start gap-2">
                  <h3 id="quick-view-title" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {quickViewProduct.name}
                  </h3>
                  <span className="w-5 h-5 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[11px] font-black shrink-0">
                    ✓
                  </span>
                </div>

                <div className="text-xs text-slate-400 font-sans">
                  {quickViewProduct.nameEn}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.floor(quickViewProduct.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-vazir">
                    {toPersianDigits(quickViewProduct.rating || 4.9)}
                  </span>
                  <span className="text-xs text-slate-400 font-vazir">
                    ({toPersianDigits(quickViewProduct.reviewCount || 42)} نظر خریداران)
                  </span>
                </div>

                {/* Price in Rial */}
                <div className="py-2">
                  <div className="text-[11px] text-slate-400 font-medium">مبلغ قابل پرداخت:</div>
                  <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-vazir mt-0.5">
                    {formatPrice(quickViewProduct.price)}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {quickViewProduct.description ||
                    'جدیدترین طراحی با قطعات باکیفیت جهانی، بهره‌مندی از پردازنده و باتری بهینه‌سازی شده و دارای گارانتی رسمی تعویض و خدمات نکسورا.'}
                </p>

                {/* Micro guarantees */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-[10px] text-slate-500 dark:text-slate-400 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center gap-1">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span>گارانتی ۲۴ ماهه</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center gap-1">
                    <Truck className="w-4 h-4 text-emerald-500" />
                    <span>ارسال اکسپرس</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex flex-col items-center gap-1">
                    <RotateCcw className="w-4 h-4 text-amber-500" />
                    <span>۷ روز بازگشت</span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="quick-view-actions mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                {/* Quantity */}
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-bold font-vazir">
                    {toPersianDigits(quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <CompareButton product={quickViewProduct} />
                {/* Add to Cart */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    added
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-95'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>به سبد اضافه شد!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>افزودن به سبد خرید</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          </div>
        </motion.div>
      </motion.div>
  );
}
