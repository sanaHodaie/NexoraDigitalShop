import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { FEATURED_COLLECTIONS } from '../../data/mockData';
import { Link } from 'react-router-dom';
import { categoryHref } from '../../data/catalog';

export const FeaturedCollections = () => {
  return (
    <section id="collections" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            مجموعه‌های برگزیده
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            دسته‌بندی‌های نوآورانه با جدیدترین تکنولوژی روز
          </p>
        </div>

        <a
          href="#trending"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors group"
        >
          <span>مشاهده همه</span>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </a>
      </div>

      {/* Grid of Collections: Full photo cards with gradient and text overlay */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {FEATURED_COLLECTIONS.map((col) => (
          <Link
            key={col.id}
            to={categoryHref(col.link.slice(1))}
            className="group relative rounded-3xl overflow-hidden h-60 sm:h-64 flex flex-col justify-between p-5 border border-slate-200/60 dark:border-slate-800 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
          >
            {/* Full Card Image Background */}
            <img
              src={col.image}
              alt={col.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />

            {/* Dark Scrim Gradient for Rich Contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-900/20 group-hover:via-slate-950/50 transition-colors" />

            {/* Top Badge/Kicker */}
            <div className="relative z-10 flex justify-end">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30">
                کالکشن برتر
              </span>
            </div>

            {/* Bottom Content: Persian text on the right, arrow button on the left */}
            <div className="relative z-10 flex items-end justify-between gap-3">
              {/* Text on Right */}
              <div className="text-right">
                <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors leading-tight">
                  {col.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1 line-clamp-1 font-medium">
                  {col.subtitle}
                </p>
              </div>

              {/* Arrow circle action button on Left */}
              <div className="w-9 h-9 rounded-full bg-blue-600/90 text-white flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:scale-110 transition-all shadow-lg shadow-black/40">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
