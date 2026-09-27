import React, { useState, useEffect } from 'react';
import { Zap, Mail, Star, Heart, ShieldCheck } from 'lucide-react';
import { FLASH_DEALS } from '../../data/mockData';
import { useShop } from '../../context/ShopContext';

export const FlashDeals = () => {
  const { addToCart, setQuickViewProduct, formatPrice, toPersianDigits, toggleWishlist, isInWishlist } = useShop();

  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 8,
    minutes: 34,
    seconds: 59,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section id="deals" className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-12">
      {/* Background card container */}
      <div className="relative rounded-[36px] sm:rounded-[44px] bg-gradient-to-br from-blue-100/90 via-indigo-50/80 to-sky-100/80 dark:from-[#131d36] dark:via-[#11192e] dark:to-[#1a1c38] border-2 border-blue-300/70 dark:border-blue-500/40 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-blue-500/10">
        
        {/* Decorative ambient glowing lights */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-400/20 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-indigo-400/20 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Floating Row: Persian Clock & Title on RIGHT, Product Cards on LEFT popping out above */}
        <div className="relative z-20 -mt-16 sm:-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Right Column: Clock & Title Card */}
          <div className="lg:col-span-4 rounded-3xl bg-white/95 dark:bg-[#18223d]/95 backdrop-blur-xl p-6 shadow-2xl border border-slate-200/90 dark:border-blue-500/35 flex flex-col justify-between text-right">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold text-xs mb-3 border border-blue-200 dark:border-blue-700/50">
                <Zap className="w-4 h-4 fill-blue-500 text-blue-500 animate-pulse" />
                <span>فرصت محدود</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                پیشنهادهای شگفت‌انگیز نکسورا
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                تخفیف‌های ویژه روی کالاهای اصیل و دیجیتال منتخب. زمان باقی‌مانده:
              </p>
            </div>

            {/* Persian Timer Box */}
            <div className="my-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-4 gap-2 text-center">
                {/* Days */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/70 shadow-sm">
                  <span className="block text-lg sm:text-xl font-black text-slate-900 dark:text-white font-vazir">
                    {toPersianDigits(timeLeft.days)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">روز</span>
                </div>

                {/* Hours */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/70 shadow-sm">
                  <span className="block text-lg sm:text-xl font-black text-slate-900 dark:text-white font-vazir">
                    {toPersianDigits(timeLeft.hours)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">ساعت</span>
                </div>

                {/* Minutes */}
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/70 shadow-sm">
                  <span className="block text-lg sm:text-xl font-black text-slate-900 dark:text-white font-vazir">
                    {toPersianDigits(timeLeft.minutes)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">دقیقه</span>
                </div>

                {/* Seconds */}
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-md shadow-blue-500/30">
                  <span className="block text-lg sm:text-xl font-black font-vazir">
                    {toPersianDigits(timeLeft.seconds)}
                  </span>
                  <span className="text-[10px] font-bold text-blue-100">ثانیه</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 dark:text-slate-300 text-center bg-blue-50/70 dark:bg-slate-800/80 py-2.5 px-3 rounded-xl border border-blue-200/60 dark:border-slate-700 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>ارسال اکسپرس رایگان برای تمامی سفارش‌های شگفت‌انگیز</span>
            </div>
          </div>

          {/* Left Column: Flash Deal Product Cards
              Adjusted to a more balanced, slightly squarer format without disturbing internal structure:
              - Image container height tuned to h-44 sm:h-48 (squarer look)
              - TOP-LEFT ICON CHANGED TO HEART (علامت قلب)
              - DISCOUNT BADGE ON TOP-RIGHT OF IMAGE
              - All texts, verified badge, stats and action pill button intact
          */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {FLASH_DEALS.slice(0, 3).map((deal) => {
              const isFavorited = isInWishlist(deal.id);

              return (
                <div
                  key={deal.id}
                  onClick={() => setQuickViewProduct(deal)}
                  className="group relative rounded-[28px] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between cursor-pointer text-right p-3.5"
                >
                  {/* TOP IMAGE CONTAINER: Squarer aspect ratio */}
                  <div className="relative w-full h-44 sm:h-48 rounded-[22px] overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {/* Product Image */}
                    <img
                      src={deal.image}
                      alt={deal.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 filter drop-shadow-md"
                      referrerPolicy="no-referrer"
                    />

                    {/* DISCOUNT BADGE STRICTLY ON TOP-RIGHT OF IMAGE */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black font-vazir shadow-lg shadow-rose-500/30">
                        ٪{toPersianDigits(deal.discountPercent)} تخفیف
                      </span>
                    </div>

                    {/* Wishlist Heart Icon on Top-Left (علامت قلب جایگزین علامت ذخیره شد) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(deal);
                      }}
                      className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-500 transition-colors shadow-md cursor-pointer active:scale-90"
                      title="افزودن به علاقه‌مندی‌ها"
                    >
                      <Heart
                        className={`w-4 h-4 transition-transform ${
                          isFavorited ? 'fill-rose-500 text-rose-500 stroke-none' : 'text-white'
                        }`}
                      />
                    </button>
                  </div>

                  {/* BOTTOM CONTENT: Strictly Right-Aligned in Persian */}
                  <div className="p-1 pt-3 space-y-2.5 flex flex-col justify-between flex-1 text-right">
                    {/* Title + Blue Verified Check Badge */}
                    <div className="flex items-center justify-start gap-1.5 text-right">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-right">
                        {deal.name}
                      </h4>
                      {/* Blue Verified Badge */}
                      <span className="w-4 h-4 rounded-full bg-[#0284c7] text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs">
                        ✓
                      </span>
                    </div>

                    {/* Description - Strictly Right-Aligned */}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed font-normal text-right">
                      طراحی مهندسی شده با ارتقای باتری و سنسورهای نسل جدید با ضمانت نکسورا.
                    </p>

                    {/* 3-Column Stats Row */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-1 text-center font-vazir">
                      {/* Col 1: Rating */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 text-xs font-black text-slate-800 dark:text-slate-200">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>۴.۹</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-medium">امتیاز کالا</span>
                      </div>

                      {/* Col 2: Total Orders */}
                      <div className="flex flex-col items-center border-x border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          +{toPersianDigits(110)}k
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">سفارش موفق</span>
                      </div>

                      {/* Col 3: Price in Rial */}
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                          {formatPrice(deal.price)}
                        </span>
                        <span className="text-[9px] text-slate-400 line-through">
                          {formatPrice(deal.originalPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Button: Full-width Black Pill "سفارش با تخفیف ویژه" */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(deal);
                      }}
                      className="mt-1.5 w-full py-2.5 rounded-full bg-slate-950 hover:bg-blue-600 dark:bg-white dark:hover:bg-blue-500 text-white dark:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>سفارش با تخفیف ویژه</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};
