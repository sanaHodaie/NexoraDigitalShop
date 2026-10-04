import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, Smartphone, Laptop, Headphones, Gamepad2, Home, Watch, Cable, Camera, Radio, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { CATEGORIES } from '../../data/mockData';
import { useShop } from '../../context/ShopContext';
import { AccountIcon } from '../../assets/icons/AccountIcon';

const iconMap = {
  Smartphone: <Smartphone className="w-4 h-4 text-blue-500" />,
  Laptop: <Laptop className="w-4 h-4 text-indigo-500" />,
  Headphones: <Headphones className="w-4 h-4 text-purple-500" />,
  Gamepad2: <Gamepad2 className="w-4 h-4 text-violet-500" />,
  Home: <Home className="w-4 h-4 text-amber-500" />,
  Watch: <Watch className="w-4 h-4 text-rose-500" />,
  Cable: <Cable className="w-4 h-4 text-teal-500" />,
  Camera: <Camera className="w-4 h-4 text-cyan-500" />,
  Radio: <Radio className="w-4 h-4 text-emerald-500" />,
};

export const MobileMenu = ({ isOpen, onClose }) => {
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const { isLoggedIn, toggleLogin } = useShop();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop with smooth fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Drawer container:
              Slides from the RIGHT with smooth cubic-bezier easing.
              Curved circular top & bottom borders (rounded-[38px]).
              Synchronized with Desktop Header: Home, Shop, Brands, Deals, Best-Sellers, Tech Magazine, Support
          */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'tween',
              ease: [0.22, 1, 0.36, 1],
              duration: 0.38,
            }}
            className="absolute top-2 bottom-2 right-2 w-[85vw] max-w-sm bg-white dark:bg-[#0f172a] shadow-2xl flex flex-col z-10 rounded-[38px] border-2 border-slate-200/80 dark:border-slate-800/80 overflow-hidden"
          >
            {/* Drawer Top Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60 rounded-t-[36px]">
              <Logo />
              <button
                onClick={onClose}
                aria-label="بستن منو"
                className="w-9 h-9 rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 no-scrollbar">
              <nav className="space-y-1">
                <a
                  href="/"
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span>صفحه نخست</span>
                  <span className="text-xs text-blue-600 font-medium">خانه</span>
                </a>

                <a
                  href="/#trending"
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span>فروشگاه نکسورا</span>
                </a>

                {/* Dropdown 1: All Categories Accordion */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>همه دسته‌بندی‌ها</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
                        categoriesExpanded ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {categoriesExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 px-3 py-2 space-y-1"
                      >
                        {CATEGORIES.map((cat) => (
                          <a
                            key={cat.id}
                            href={`/#${cat.id}`}
                            onClick={onClose}
                            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              {iconMap[cat.icon]}
                              <span>{cat.name}</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {cat.count}+ کالا
                            </span>
                          </a>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Dropdown 2: Brands & Collections */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setBrandsExpanded(!brandsExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>برندها و تخفیف‌های ویژه</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
                        brandsExpanded ? 'rotate-180 text-rose-600' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {brandsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 px-3 py-2 space-y-1"
                      >
                        <a
                          href="/#deals"
                          onClick={onClose}
                          className="block px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-rose-500 rounded-xl"
                        >
                          ⚡ تخفیف‌های شگفت‌انگیز (Flash Deals)
                        </a>
                        <a
                          href="/#collections"
                          onClick={onClose}
                          className="block px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-500 rounded-xl"
                        >
                          💎 کالکشن‌های اختصاصی سال ۲۰۲۵
                        </a>
                        <a
                          href="/#recommended"
                          onClick={onClose}
                          className="block px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-500 rounded-xl"
                        >
                          ⭐ محصولات برگزیده و پرفروش
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Additional synced links as requested */}
                <a
                  href="/#trending"
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span>پرفروش‌ترین‌ها</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                    داغ‌ترین
                  </span>
                </a>

                <a
                  href="/#articles"
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span>مجله تخصصی فناوری</span>
                </a>

                <a
                  href="/#footer"
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <span>پشتیبانی و ارتباط با ما</span>
                </a>
              </nav>

              {/* Trust Badge */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-850 border border-blue-100/80 dark:border-slate-800 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    ضمانت اصالت ۷ روزه کالا
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    تمامی محصولات نکسورا دارای گارانتی معتبر هستند.
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Bottom Footer (User Account status) */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/80 flex items-center justify-between rounded-b-[36px]">
              <span className="text-xs text-slate-500">حساب کاربری:</span>
              <button
                onClick={() => {
                  toggleLogin();
                  onClose();
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-slate-800 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200/60 dark:border-slate-700"
              >
                {isLoggedIn ? (
                  <>
                    <AccountIcon className="w-4 h-4" />
                    <span>حساب کاربری</span>
                  </>
                ) : (
                  <>
                    <AccountIcon className="w-4 h-4" />
                    <span>ورود به حساب</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
