import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag, Search } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from '../Common/ThemeToggle';
import { MobileMenu } from './MobileMenu';
import { useShop } from '../../context/ShopContext';
import { AccountIcon } from '../../assets/icons/AccountIcon';
import { MenuIcon } from '../../assets/icons/MenuIcon';
import { CloseIcon } from '../../assets/icons/CloseIcon';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [hideDesktopHeader, setHideDesktopHeader] = useState(false);

  useEffect(() => {
    const footer = document.getElementById('footer');
    if (!footer) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    let footerVisible = false;
    const update = () => setHideDesktopHeader(desktop.matches && footerVisible);
    const observer = new IntersectionObserver(([entry]) => {
      footerVisible = entry.isIntersecting;
      update();
    });
    observer.observe(footer);
    desktop.addEventListener('change', update);
    return () => { observer.disconnect(); desktop.removeEventListener('change', update); };
  }, []);

  const {
    totalCartCount,
    totalWishlistCount,
    setIsCartOpen,
    setIsWishlistModalOpen,
    isLoggedIn,
    user,
    toggleLogin,
    searchQuery,
    setSearchQuery,
    toPersianDigits,
    formatPrice,
    setQuickViewProduct,
    allProducts,
  } = useShop();

  // Desktop Navigation links - enriched with more items
  const desktopNavLinks = [
    { label: 'خانه', href: '/' },
    { label: 'فروشگاه', href: '/#trending' },
    { label: 'برندها', href: '/#collections' },
    { label: 'تخفیف‌ها', href: '/#deals', isDeal: true },
    { label: 'پرفروش‌ترین‌ها', href: '/#trending' },
    { label: 'مجله فناوری', href: '/#articles' },
    { label: 'پشتیبانی', href: '/#footer' },
  ];

  // Filtered products for live search (especially on mobile)
  const filteredProducts = searchQuery.trim()
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.categoryFa.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className="sticky top-2 sm:top-4 z-40 px-2 sm:px-6 max-w-7xl mx-auto w-full lg:static lg:h-[62px]">
      <div className="lg:fixed lg:top-4 lg:inset-x-0 lg:max-w-7xl lg:mx-auto lg:px-6">
      {/* Floating Glassmorphic Header */}
      {!hideDesktopHeader && <header className="rounded-full bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl border border-white/70 dark:border-slate-700/60 shadow-lg shadow-blue-900/5 px-3.5 sm:px-6 py-2 sm:py-2.5 transition-colors duration-300">
        
        {/* DESKTOP HEADER */}
        <div className="hidden lg:flex items-center justify-between gap-4">
          {/* Right: Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Logo />
          </div>

          {/* Center: Navigation Links */}
          <nav className="flex items-center gap-4 xl:gap-6">
            {desktopNavLinks.map((item, idx) => (
              <Link
                key={idx}
                to={item.href}
                className="relative text-xs xl:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1 flex items-center gap-1"
              >
                <span>{item.label}</span>
                {item.isDeal && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-extrabold border border-rose-500/20">
                    ویژه
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Left Zone: Search Icon beside other action icons */}
          <div className="flex items-center gap-2 xl:gap-2.5 shrink-0">
            {/* Desktop Search Toggle */}
            <div className="relative flex items-center">
              <AnimatePresence>
                {desktopSearchOpen ? (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 230, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-1 border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="جستجو در محصولات..."
                      className="min-w-0 w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        setDesktopSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    >
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </motion.div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDesktopSearchOpen(true)}
                    aria-label="جستجو"
                    title="جستجو در نکسورا"
                    className="w-8 h-8 rounded-full bg-slate-100/90 dark:bg-slate-800/90 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </AnimatePresence>
            </div>

            <ThemeToggle />

            {/* User Account / Login Button */}
            <button
              type="button"
              onClick={toggleLogin}
              aria-label={isLoggedIn ? 'حساب کاربری' : 'ورود به حساب کاربری'}
              title={isLoggedIn ? `${user?.fullName || user?.email || 'حساب کاربری'}` : 'ورود به حساب کاربری'}
              className="w-8 h-8 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {isLoggedIn ? (
                <AccountIcon className="w-4 h-4" />
              ) : (
                <AccountIcon className="w-4 h-4" />
              )}
            </button>

            {/* Wishlist Button with top-left badge */}
            <button
              type="button"
              onClick={() => setIsWishlistModalOpen(true)}
              aria-label="علاقه‌مندی‌ها"
              title="مشاهده نشان‌شده‌ها"
              className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-100/90 dark:bg-slate-800/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700"
            >
              <Heart className="w-4 h-4" />
              <span className="absolute -top-1.5 -left-1.5 min-w-[17px] h-[17px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-md border border-white dark:border-slate-900 font-vazir">
                {toPersianDigits(totalWishlistCount)}
              </span>
            </button>

            {/* Cart Button with top-left badge */}
            <button
              onClick={() => setIsCartOpen(true)}
              type="button"
              aria-label="سبد خرید"
              title="مشاهده سبد خرید"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-md shadow-blue-500/25 active:scale-95 group"
            >
              <span className="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md border border-white dark:border-slate-900 font-vazir">
                {toPersianDigits(totalCartCount)}
              </span>

              <ShoppingBag className="w-4 h-4 group-hover:-rotate-6 transition-transform" />
            </button>
          </div>
        </div>

        {/* MOBILE & TABLET HEADER (lg:hidden) */}
        <div className="flex lg:hidden items-center justify-between min-h-[36px] relative">
          <AnimatePresence mode="wait">
            {isSearchActive ? (
              /* ACTIVE MOBILE SEARCH BAR:
                 Search icon goes to the right, and input expands smoothly to the right-to-left
                 with the Close icon on the left!
              */
              <motion.div
                key="mobile-search-bar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="w-full flex items-center gap-2"
              >
                {/* Search Icon at Right */}
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 shrink-0">
                  <Search className="w-4 h-4" />
                </div>

                {/* Input expands to the right side */}
                <motion.input
                  initial={{ width: '40%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.25 }}
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی کالا (مثال: کنسول بازی، هدفون...)"
                  className="min-w-0 flex-1 bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 rounded-full px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-vazir"
                />

                {/* Close Button using uploaded close.svg */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchActive(false);
                    setSearchQuery('');
                  }}
                  aria-label="بستن جستجو"
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0 p-1.5 cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              /* NORMAL MOBILE HEADER:
                 Right: Hamburger + NEXORA brand
                 Left: Search icon right beside Darkmode, Wishlist, Cart
              */
              <motion.div
                key="mobile-normal-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full flex items-center justify-between gap-2"
              >
                {/* Right: Hamburger + Brand Name */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    aria-label="منو"
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-1.5 cursor-pointer"
                  >
                    <MenuIcon className="w-4 h-4" />
                  </button>
                  <Link to="/" className="flex flex-col text-right">
                    <span className="text-sm sm:text-base font-black sm:tracking-wider bg-gradient-to-l from-blue-700 via-indigo-600 to-slate-900 dark:from-sky-400 dark:via-blue-300 dark:to-white bg-clip-text text-transparent font-sans">
                      NEXORA
                    </span>
                  </Link>
                </div>

                {/* Left: Search Icon placed directly beside Dark Mode, Wishlist & Cart */}
                <div className="mobile-header-actions flex items-center gap-1 sm:gap-2">
                  <button type="button" onClick={toggleLogin}
                    title={isLoggedIn ? user?.fullName || user?.email : 'ورود به حساب کاربری'}
                    aria-label={isLoggedIn ? 'حساب کاربری' : 'ورود به حساب کاربری'}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer">
                    {isLoggedIn ? <AccountIcon className="w-4 h-4" /> : <AccountIcon className="w-4 h-4" />}
                  </button>
                  {/* Search Icon right beside other icons */}
                  <button
                    type="button"
                    onClick={() => setIsSearchActive(true)}
                    className="w-8 h-8 rounded-full bg-slate-100/90 dark:bg-slate-800/90 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200/60 dark:border-slate-700"
                    title="جستجو"
                  >
                    <Search className="w-4 h-4" />
                  </button>

                  {/* Dark Mode Beside Search */}
                  <ThemeToggle className="scale-90" />

                  {/* Wishlist Button with top-left badge */}
                  <button
                    type="button"
                    onClick={() => setIsWishlistModalOpen(true)}
                    className="relative w-8 h-8 rounded-full bg-slate-100/90 dark:bg-slate-800/90 flex items-center justify-center text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700"
                    title="علاقه‌مندی‌ها"
                  >
                    <Heart className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    <span className="absolute -top-1.5 -left-1.5 min-w-[17px] h-[17px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-md border border-white dark:border-slate-900 font-vazir">
                      {toPersianDigits(totalWishlistCount)}
                    </span>
                  </button>

                  {/* Cart Button with top-left badge */}
                  <button
                    onClick={() => setIsCartOpen(true)}
                    type="button"
                    className="relative w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md cursor-pointer"
                    title="سبد خرید"
                  >
                    <span className="absolute -top-1.5 -left-1.5 min-w-[17px] h-[17px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-md border border-white dark:border-slate-900 font-vazir">
                      {toPersianDigits(totalCartCount)}
                    </span>
                    <ShoppingBag className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MOBILE LIVE SEARCH RESULTS DROPDOWN:
            Compact list with:
            Right: Product Image
            Left: Brief Description & Price in Rial
        */}
        {isSearchActive && searchQuery.trim() !== '' && (
          <div className="lg:hidden absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1 max-h-72 overflow-y-auto">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setQuickViewProduct(p);
                    setIsSearchActive(false);
                  }}
                  className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-3 text-right cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                >
                  {/* Right side: Product Thumbnail Image */}
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 shrink-0 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Left side: Compact Brief Description & Price in Rial */}
                  <div className="flex-1 text-right">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {p.name}
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {p.categoryFa} · گارانتی اصالت
                    </p>
                    <div className="text-[11px] font-black text-blue-600 dark:text-blue-400 font-vazir mt-0.5">
                      {formatPrice(p.price)}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                هیچ کالایی مطابق با «{searchQuery}» یافت نشد.
              </div>
            )}
          </div>
        )}
      </header>}
      </div>

      {/* Mobile Drawer Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  );
};
