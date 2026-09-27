import React from 'react';
import { ArrowLeft, BookOpen, Clock } from 'lucide-react';
import { ARTICLES } from '../../data/mockData';

export const InspirationSection = () => {
  return (
    <section id="articles" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            الهام‌بخش و نوآوری
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            آخرین مقالات، راهنماهای خرید و تحلیل‌های تخصصی دنیای گجت
          </p>
        </div>

        <a
          href="#"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors group"
        >
          <span>مشاهده همه مقالات</span>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </a>
      </div>

      {/* 4 Article Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ARTICLES.map((article) => (
          <article
            key={article.id}
            className="group relative rounded-2xl overflow-hidden bg-slate-900 h-64 sm:h-72 flex flex-col justify-end p-4 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            {/* Background Image with Scrim Gradient */}
            <img
              src={article.image}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70 group-hover:opacity-60"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

            {/* Content Overlay */}
            <div className="relative z-10 text-right">
              {/* Tag pill */}
              <span
                className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-md text-white ${article.tagColor} mb-2 shadow-xs`}
              >
                {article.tag}
              </span>

              {/* Title */}
              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
                {article.title}
              </h3>

              {/* Read time and date */}
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-300">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{article.readTime}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>{article.date}</span>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
