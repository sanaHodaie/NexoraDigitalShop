import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronLeft } from 'lucide-react';
import { HERO_IMAGE } from '../../data/mockData';

export const HeroSection = () => {
  return (
    <section className="relative w-full overflow-hidden min-h-[580px] sm:min-h-[600px] lg:min-h-[640px] flex items-center -mt-14 sm:-mt-16 pt-16 sm:pt-20">
      {/* Background Image: Positioned to keep laptop & gadgets clearly visible across devices */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={HERO_IMAGE}
          alt="نسل جدید تجهیزات الکترونیک نکسورا"
          className="w-full h-full object-cover object-[70%_center] sm:object-left lg:object-center select-none"
          referrerPolicy="no-referrer"
        />
        {/* Soft readable gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/40 to-white/70 dark:from-[#0b0f19]/95 dark:via-[#0b0f19]/40 dark:to-[#0b0f19]/70 md:bg-gradient-to-l md:from-white/95 md:via-white/75 md:to-transparent dark:md:from-[#0b0f19]/95 dark:md:via-[#0b0f19]/75 dark:md:to-transparent/30" />
      </div>

      {/* Hero Content Overlay: Positioned cleanly on the right in RTL */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-10 sm:py-16">
        <div className="max-w-xl text-right">
          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 dark:text-white leading-[1.25] sm:leading-[1.18] tracking-tight mb-4"
          >
            نسل جدید الکترونیک.
            <br />
            <span className="bg-gradient-to-l from-blue-700 via-indigo-600 to-sky-500 dark:from-blue-400 dark:via-indigo-300 dark:to-sky-300 bg-clip-text text-transparent">
              امکانات بی‌پایان.
            </span>
          </motion.h1>

          {/* Subtitle Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="text-slate-700 dark:text-slate-200 text-xs sm:text-base leading-relaxed mb-6 font-medium max-w-lg"
          >
            آینده فناوری همین‌جاست. هوشمندانه‌تر کار کنید، با شفافیت بشنوید و با جدیدترین شاهکارهای دیجیتال نکسورا دنیای خود را ارتقا دهید.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.3 }}
            className="flex flex-wrap items-center gap-2.5 sm:gap-4"
          >
            <a
              href="#trending"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-500/30 transition-all duration-200 cursor-pointer group"
            >
              <span>مشاهده مجموعه</span>
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </a>

            <a
              href="#deals"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 shadow-md backdrop-blur-sm hover:border-blue-400 transition-all duration-200 cursor-pointer"
            >
              <span>کاوش تخفیف‌ها</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
