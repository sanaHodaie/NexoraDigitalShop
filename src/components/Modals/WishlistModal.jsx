import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, ShoppingBag, Trash2, ArrowLeft } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { CloseIcon } from '../../assets/icons/CloseIcon';

export const WishlistModal = () => {
  const {
    wishlist,
    isWishlistModalOpen,
    setIsWishlistModalOpen,
    toggleWishlist,
    addToCart,
    formatPrice,
    setQuickViewProduct,
  } = useShop();

  if (!isWishlistModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsWishlistModalOpen(false)}
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                کالاهای نشان‌شده و علاقه‌مندی‌ها ({wishlist.length})
              </h3>
            </div>
            <button
              onClick={() => setIsWishlistModalOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer p-1.5"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-3">
            {wishlist.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
                  <Heart className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  لیست علاقه‌مندی‌های شما خالی است
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  برای ذخیره کالاهای محبوب روی آیکون قلب در کنار محصولات کلیک کنید.
                </p>
              </div>
            ) : (
              wishlist.map((item) => (
                <div
                  key={item.id}
                  className="product-hover-card flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                >
                  {/* Thumbnail & Title */}
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      onClick={() => {
                        setQuickViewProduct(item);
                        setIsWishlistModalOpen(false);
                      }}
                      className="w-14 h-14 rounded-xl bg-white dark:bg-slate-800 p-1 shrink-0 overflow-hidden border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="text-right">
                      <h4
                        onClick={() => {
                          setQuickViewProduct(item);
                          setIsWishlistModalOpen(false);
                        }}
                        className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 hover:text-blue-600 cursor-pointer"
                      >
                        {item.name}
                      </h4>
                      <div className="text-xs font-black text-blue-600 dark:text-blue-400 font-vazir mt-0.5">
                        {formatPrice(item.price)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">افزودن به سبد</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(item)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="حذف از نشان‌شده‌ها"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between">
            <span className="text-xs text-slate-500">نکسورا · تضمین اصالت و ضمانت</span>
            <button
              onClick={() => setIsWishlistModalOpen(false)}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              بستن پنجره
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
