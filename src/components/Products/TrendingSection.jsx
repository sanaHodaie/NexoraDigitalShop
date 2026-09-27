import React, { useState } from 'react';
import { Heart, Plus, Users, Award, Flame } from 'lucide-react';
import { TRENDING_PRODUCTS } from '../../data/mockData';
import { useShop } from '../../context/ShopContext';

export const TrendingSection = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct, formatPrice, toPersianDigits } = useShop();

  const categories = [
    { id: 'all', label: 'همه داغ‌ترین‌ها' },
    { id: 'smartphones', label: 'موبایل' },
    { id: 'laptops', label: 'لپ‌تاپ' },
    { id: 'audio', label: 'صوتی' },
    { id: 'gaming', label: 'گیمینگ' },
  ];

  const filteredProducts =
    activeCategory === 'all'
      ? TRENDING_PRODUCTS
      : TRENDING_PRODUCTS.filter((p) => p.category === activeCategory);

  return (
    <section id="trending" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-xs mb-2 border border-rose-200/50 dark:border-rose-900/50">
            <Flame className="w-4 h-4 fill-rose-500 text-rose-500" />
            <span>پرفروش‌ترین‌های منتخب هفته</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            داغ‌ترین‌های بازار
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            جدیدترین و محبوب‌ترین کالاهای دیجیتال با بالاترین رضایت مشتریان
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid:
          Adjusted to a slightly more square/compact proportion (h-[390px] sm:h-[410px])
          without changing any structure, verified green badge, right-aligned Persian texts, stats, or pill button.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredProducts.map((product) => {
          const isFavorited = isInWishlist(product.id);

          return (
            <div
              key={product.id}
              onClick={() => setQuickViewProduct(product)}
              className="group relative rounded-[30px] overflow-hidden bg-slate-900 h-[390px] sm:h-[410px] flex flex-col justify-end p-4 sm:p-4.5 shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-200/50 dark:border-slate-800 text-right cursor-pointer"
            >
              {/* Full Image Background */}
              <img
                src={product.image}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />

              {/* Bottom Frosted Glass Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent dark:from-slate-950/95 dark:via-slate-950/70 dark:to-transparent pointer-events-none" />

              {/* Wishlist Heart Icon (Top-Left) */}
              <div className="absolute top-3.5 left-3.5 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(product);
                  }}
                  aria-label="افزودن به علاقه‌مندی‌ها"
                  className="w-8 h-8 rounded-full bg-white/75 dark:bg-black/40 backdrop-blur-md border border-white/60 dark:border-slate-700 text-slate-700 dark:text-white flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-md active:scale-90"
                >
                  <Heart
                    className={`w-4 h-4 transition-transform ${
                      isFavorited ? 'fill-rose-500 text-rose-500 stroke-none' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Top-Right Badge: Price in Rial badge */}
              <div className="absolute top-3.5 right-3.5 z-20">
                <span className="px-3 py-1 rounded-full bg-slate-900/80 dark:bg-black/60 text-white backdrop-blur-md text-[11px] font-black font-vazir shadow-md border border-white/20">
                  {formatPrice(product.price)}
                </span>
              </div>

              {/* Bottom Card Content: Strictly Right-Aligned in both Mobile and Desktop */}
              <div className="relative z-10 text-right space-y-1.5 w-full">
                
                {/* Title + Green Verified Badge */}
                <div className="flex items-center justify-start gap-1.5 text-right">
                  <h3
                    className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 text-right"
                    title={product.name}
                  >
                    {product.name}
                  </h3>
                  
                  {/* Verified Green Badge */}
                  <span className="w-4.5 h-4.5 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm shadow-emerald-500/40">
                    ✓
                  </span>
                </div>

                {/* Subtitle / Description - Right-Aligned in Persian */}
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-1 leading-relaxed font-medium text-right">
                  {product.description || 'جدیدترین طراحی ارگونومیک با تکنولوژی هوشمند نکسورا.'}
                </p>

                {/* Bottom Stats & Follow/Add Pill Row */}
                <div className="pt-2.5 flex items-center justify-between border-t border-slate-200/80 dark:border-slate-800">
                  
                  {/* Left Side: Follow / Add Pill Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-200/90 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 border border-slate-300/60 dark:border-slate-700"
                  >
                    <span>افزودن</span>
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  {/* Right Side in RTL: Stats with icons */}
                  <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-bold text-xs">
                    {/* Review Score */}
                    <div className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="font-vazir text-[11px]">
                        {toPersianDigits(product.reviewCount || 42)}
                      </span>
                    </div>

                    {/* Buyer Count */}
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="font-vazir text-[11px]">
                        {toPersianDigits(product.stock ? product.stock * 15 : 312)}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
