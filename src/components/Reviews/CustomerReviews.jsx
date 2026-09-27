import React from 'react';
import { Star, CheckCircle } from 'lucide-react';
import { TESTIMONIALS } from '../../data/mockData';

export const CustomerReviews = () => {
  return (
    <section id="reviews" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="text-right mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          نظرات خریداران نکسورا
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          بیش از ۱۲,۰۰۰ کاربر تجربه خریدی مطمئن را با ما به اشتراک گذاشته‌اند
        </p>
      </div>

      {/* 3 Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((review) => (
          <div
            key={review.id}
            className="rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow"
          >
            {/* User Quote */}
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal mb-5 text-right">
              {review.quote}
            </p>

            {/* User Profile & Stars */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                {/* Clean avatar with fallback initials */}
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs border border-blue-200 dark:border-blue-800 shrink-0">
                  {review.name.slice(0, 2)}
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {review.name}
                    </span>
                    <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-50 dark:fill-slate-800" />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {review.role}
                  </span>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-0.5">
                {[...Array(review.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
