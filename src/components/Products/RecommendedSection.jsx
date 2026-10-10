import React from 'react';
import { Heart, Plus } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const RecommendedSection = () => {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct, formatPrice, allProducts } = useShop();

  return (
    <section id="recommended" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="text-right">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            پیشنهاد شده برای شما
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            بر اساس تاریخچه جستجو و سلیقه تکنولوژی شما
          </p>
        </div>
      </div>

      {/* Product Cards Grid: Texts strictly on the RIGHT side across all devices (mobile and desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {allProducts.filter(p => p.id.startsWith('rec-')).map((product) => {
          const isFavorited = isInWishlist(product.id);

          return (
            <div
              key={product.id}
              className="product-hover-card group relative rounded-[28px] overflow-hidden bg-slate-900 h-96 sm:h-[420px] flex flex-col justify-end p-5 shadow-xl cursor-pointer border border-slate-200/50 dark:border-slate-800 text-right"
            >
              {/* Full Background Product Photo */}
              <img
                src={product.image}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

              {/* Scrim gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent" />

              {/* Top Row: Heart button for Adding to Wishlist */}
              <div className="absolute top-4 left-4 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(product);
                  }}
                  aria-label="افزودن به علاقه‌مندی‌ها"
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-lg active:scale-90"
                >
                  <Heart
                    className={`w-4 h-4 transition-transform ${
                      isFavorited ? 'fill-rose-500 text-rose-500 stroke-none' : 'text-white'
                    }`}
                  />
                </button>
              </div>

              {/* Card Bottom Content: Strictly right-aligned on mobile and desktop */}
              <div className="relative z-10 text-right space-y-2 w-full">
                {/* Title with Verified Check Badge: Placed strictly on the right (RTL first) */}
                <div className="flex items-center justify-start gap-1.5 flex-row-reverse text-right">
                  <h3
                    onClick={() => setQuickViewProduct(product)}
                    className="text-base sm:text-lg font-black text-white hover:text-blue-300 transition-colors line-clamp-1 text-right"
                    title={product.name}
                  >
                    {product.name}
                  </h3>
                  <span className="w-4 h-4 rounded-full bg-white text-slate-900 flex items-center justify-center text-[10px] shrink-0 font-bold">
                    ✓
                  </span>
                </div>

                {/* Subtitle / Description text right-aligned */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-normal text-right">
                  {product.description || 'محصول هوشمند نسل جدید با تضمین اصالت و کیفیت بالا.'}
                </p>

                {/* Bottom Row: Price on right, Add button on left */}
                <div className="pt-2 flex items-center justify-between border-t border-white/15">
                  {/* Price in Rial on the Right */}
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] text-slate-300 font-medium text-right">قیمت کالا</span>
                    <span className="text-xs sm:text-sm font-black text-white font-vazir text-right">
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  {/* Add Pill Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="flex items-center gap-1 px-4 py-2 rounded-full bg-white hover:bg-blue-50 text-slate-900 text-xs font-bold transition-all shadow-lg active:scale-95 cursor-pointer shrink-0"
                  >
                    <span>افزودن</span>
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
