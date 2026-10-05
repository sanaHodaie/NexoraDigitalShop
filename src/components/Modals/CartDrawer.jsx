import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowLeft, CheckCircle, Truck } from 'lucide-react';
import { api } from '../../api/client';
import { useShop } from '../../context/ShopContext';

export const CartDrawer = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
    formatPrice,
    clearCart,
  } = useShop();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');

  const freeShippingThreshold = 99;
  const isFreeShipping = cartSubtotal >= freeShippingThreshold;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);

  const finalTotal = cartSubtotal;
  const handleCheckout = async () => {
    setCheckoutError(''); setIsCheckingOut(true);
    try { const order = await api('/account/orders', { method: 'POST' }); setOrderComplete(order); await clearCart(); }
    catch (error) { setCheckoutError(error.message); }
    finally { setIsCheckingOut(false); }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Drawer from left in RTL */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.35 }}
            className="absolute top-0 bottom-0 left-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col z-10 border-r border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  سبد خرید شما ({cart.length})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Free Shipping Tracker */}
            <div className="bg-blue-50 dark:bg-blue-950/40 px-6 py-3 border-b border-blue-100 dark:border-blue-900/40">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1.5">
                <Truck className="w-4 h-4" />
                {isFreeShipping ? (
                  <span>تبریک! سفارش شما مشمول ارسال رایگان است.</span>
                ) : (
                  <span>
                    فقط {formatPrice(remainingForFreeShipping)} تا ارسال اکسپرس رایگان!
                  </span>
                )}
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (cartSubtotal / freeShippingThreshold) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {orderComplete ? (
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                    سفارش شما با موفقیت ثبت گردید!
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    شماره سفارش: {orderComplete.id}. پرداخت هنوز انجام نشده است؛ این سفارش در انتظار پرداخت است.
                  </p>
                  <button
                    onClick={() => {
                      setOrderComplete(false);
                      setIsCartOpen(false);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    ادامه خرید
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    سبد خرید شما خالی است
                  </h4>
                  <p className="text-xs text-slate-400">
                    کالاهای دلخواه خود را از میان پرفروش‌ترین‌ها انتخاب نمایید.
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    مشاهده فروشگاه
                  </button>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="cart-drawer-item flex items-start min-w-0 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 relative group"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-white dark:bg-slate-800 p-2 shrink-0 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 text-right">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white break-words leading-6">
                        {item.product.name}
                      </h4>
                      <div className="text-xs break-words font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                        {formatPrice(item.product.price)}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold font-mono text-slate-800 dark:text-slate-100">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                          title="حذف کالا"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with totals and checkout */}
            {!orderComplete && cart.length > 0 && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 space-y-4">
                {/* Promo Code Input */}
                {/* Subtotal & Discount rows */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>جمع اقلام:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {formatPrice(cartSubtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>هزینه ارسال:</span>
                    <span className="font-medium text-emerald-600">
                      {isFreeShipping ? 'رایگان' : formatPrice(9.99)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span>مبلغ قابل پرداخت:</span>
                    <span className="text-base text-blue-600 font-mono">
                      {formatPrice(finalTotal + (isFreeShipping ? 0 : 9.99))}
                    </span>
                  </div>
                </div>

                {checkoutError && <p role="alert" className="text-red-600 text-xs">{checkoutError}</p>}
                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCheckingOut ? (
                    <span>در حال ثبت سفارش...</span>
                  ) : (
                    <>
                      <span>ثبت سفارش در انتظار پرداخت</span>
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
