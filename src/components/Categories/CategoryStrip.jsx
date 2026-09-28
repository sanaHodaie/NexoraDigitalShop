import React from 'react';
import { CATEGORIES } from '../../data/mockData';

export const CategoryStrip = () => {
  return (
    <section className="relative z-20 -mt-20 sm:-mt-24 max-w-6xl mx-auto px-2 sm:px-6">
      {/* Box strictly pushed deeper inside Hero on mobile (-mt-20) and desktop (-mt-24), with elegant glass styling */}
      <div className="rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-xl shadow-blue-950/5 p-3 sm:p-5">
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2 sm:gap-3 items-center justify-items-center">
          {CATEGORIES.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="min-w-0 max-w-full flex flex-col items-center justify-center group select-none cursor-pointer py-1"
            >
              {/* Circular Category Photo */}
              <div className="relative w-11 h-11 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-slate-200/80 dark:border-slate-700/80 group-hover:border-blue-500 group-hover:shadow-md group-hover:shadow-blue-500/25 group-hover:scale-105 transition-all duration-300">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Title directly underneath each circle */}
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 mt-1.5 text-center leading-tight transition-colors line-clamp-1">
                {category.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
