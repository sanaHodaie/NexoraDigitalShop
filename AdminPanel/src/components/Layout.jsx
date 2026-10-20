import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Coins,
  Gem,
  ShoppingBag,
  MessageSquare,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Menu,
  X,
  Search,
  Bell,
  Sparkles,
  ChevronLeft,
  ShieldCheck,
  LogOut,
  UserCheck
} from 'lucide-react';
import { playTactileClick, setAudioMuted, getAudioMuted } from '../utils/sound';
import { toPersianDigits } from '../utils/formatters';

export default function Layout({
  activePage,
  onNavigate,
  children,
  rates = [],
  onRefreshRates = () => {},
  isRefreshingRates = false,
  unreadCount = 0,
  themeMode,
  onToggleTheme,
  currentUser,
  onLogout,
  onOpenLogin,
  can = (_permission) => true,
  onSearch
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMutedState, setIsMutedState] = useState(getAudioMuted());

  const navItems = [
    { id: 'assistant', label: 'راهنمای هوشمند خرید', icon: Sparkles, badge: null },
    { id: 'dashboard', label: 'داشبورد اصلی', icon: LayoutDashboard, badge: null },
    { id: 'products', label: 'محصولات و موجودی', icon: Gem, badge: null },
    { id: 'orders', label: 'سفارشات و فاکتورها', icon: ShoppingBag, badge: null },
    { id: 'messages', label: 'اعضای خبرنامه', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : null },
    { id: 'customers', label: 'حساب‌های کاربران', icon: Users, badge: null },
    { id: 'logs', label: 'گزارش ورود و ثبت‌نام', icon: ShieldCheck, badge: null },
    { id: 'content', label: 'محتوای صفحه اصلی', icon: LayoutDashboard, badge: null },
    { id: 'articles', label: 'مجله فناوری', icon: MessageSquare, badge: null },
    { id: 'settings', label: 'تنظیمات سیستم', icon: SettingsIcon, badge: null }
  ].filter(item => can(({assistant:'assistant:read',dashboard:'dashboard:read',gold_rates:'content:read',products:'products:read',orders:'orders:read',messages:'subscribers:read',customers:'users:read',analytics:'dashboard:read',settings:'content:read',content:'content:read',articles:'content:read',logs:'audit:read'})[item.id]));

  const handleNavClick = (pageId) => {
    playTactileClick();
    onNavigate(pageId);
    setIsMobileMenuOpen(false);
  };

  const handleSoundToggle = () => {
    const nextMuted = !isMutedState;
    setIsMutedState(nextMuted);
    setAudioMuted(nextMuted);
    if (!nextMuted) playTactileClick();
  };

  return (
    <div className="min-h-screen h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
      <div className="flex-1 flex flex-row overflow-hidden relative h-full">
        {/* Desktop Glassmorphism Sidebar (Fixed 72 width) */}
        <aside className="hidden lg:flex flex-col w-72 flex-shrink-0 border-l border-purple-100/70 dark:border-purple-950/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 justify-between select-none h-full overflow-y-auto">
          {/* Brand Logo & Title */}
          <div className="space-y-6">
            <div
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
                N
              </div>
              <div>
                <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  نکسورا دیجیتال
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                </h2>
                <span className="text-[11px] text-slate-400 font-medium block">
                  پنل مدیریت فروشگاه دیجیتال
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all relative ${
                      isActive
                        ? 'bg-gradient-to-l from-purple-600/15 via-pink-600/10 to-transparent text-purple-700 dark:text-purple-300 border-r-4 border-purple-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-purple-50/50 dark:hover:bg-slate-800/50 hover:text-purple-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`p-1.5 rounded-xl transition-colors ${
                          isActive
                            ? 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-purple-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          typeof item.badge === 'number'
                            ? 'bg-pink-600 text-white animate-pulse'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        }`}
                      >
                        {typeof item.badge === 'number' ? toPersianDigits(item.badge) : item.badge}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </div>

          {/* User & Store Card Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm shadow-purple-500/20">
                  {currentUser?.name?.charAt(0) || 'م'}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {currentUser?.name || 'مدیریت نکسورا'}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {currentUser?.username ? `@${currentUser.username}` : 'دسترسی مدیریت'}
                  </span>
                </div>
              </div>

              {/* Logout / Switch User Button */}
              <button
                aria-label="منوی مدیریت"
                aria-expanded={isMobileMenuOpen}
                onClick={() => {
                  playTactileClick();
                  if (onLogout) onLogout();
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="خروج از حساب / باز کردن صفحه ورود"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden">
          {/* Top Bar Navigation */}
          <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 md:px-8 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-purple-100/60 dark:border-purple-950/40 min-w-0">
            {/* Left: Mobile Menu Toggle, Title & Search Bar */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-lg min-w-0">
              <button
                onClick={() => {
                  playTactileClick();
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                className="lg:hidden p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs flex-shrink-0"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <div className="hidden sm:block truncate min-w-0">
                <h2 className="text-sm font-black text-slate-800 dark:text-white truncate">
                  {navItems.find((n) => n.id === activePage)?.label || 'پنل مدیریت نکسورا'}
                </h2>
              </div>

              {/* Quick Global Search in Bento Style */}
              <div className="hidden md:flex items-center gap-2 flex-1 px-3 py-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-purple-100/60 dark:border-purple-900/30 text-xs text-slate-400 focus-within:border-purple-400 focus-within:bg-white dark:focus-within:bg-slate-900 transition-all min-w-0">
                <Search className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                <input
                  type="text"
                  onKeyDown={e=>{if(e.key==='Enter')onSearch?.(e.currentTarget.value);}}
                  aria-label="جستجوی محصول"
                  placeholder="جستجوی محصول و فشردن Enter…"
                  className="bg-transparent border-none outline-none text-xs text-slate-700 dark:text-slate-200 w-full placeholder:text-slate-400 min-w-0"
                />
                <span className="text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 font-mono text-slate-400 flex-shrink-0">
                  ⌘K
                </span>
              </div>
            </div>

            {/* Right: Sound, Dark Mode, Notifications, User/Login Quick Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Tactile Sound Feedback Switch */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSoundToggle}
                className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-purple-600 shadow-xs transition-colors"
                title={isMutedState ? 'فعال‌سازی صدای لمس دکمه‌ها' : 'بی‌صدا کردن'}
              >
                {isMutedState ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-purple-600" />
                )}
              </motion.button>

              {/* Theme Toggle (Dark / Light) */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playTactileClick();
                  onToggleTheme();
                }}
                className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-500 shadow-xs transition-colors"
                title="تغییر تم تاریک / روشن"
              >
                {themeMode === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-purple-600" />
                )}
              </motion.button>

              {/* Messages Quick Badge */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNavClick('messages')}
                className="relative p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-pink-600 shadow-xs transition-colors"
                title="اعضای خبرنامه"
              >
                <MessageSquare className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                    {toPersianDigits(unreadCount)}
                  </span>
                )}
              </motion.button>

              {/* Quick Login / Logout Screen Trigger */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playTactileClick();
                  if (onOpenLogin) onOpenLogin();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800 dark:to-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold shadow-xs hover:border-purple-400 transition-all cursor-pointer"
                title="ورود یا خروج از حساب کاربری"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>خروج</span>
              </motion.button>
            </div>
          </header>

          {/* Page Container */}
          <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Drawer Navigation Modal */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-72 max-w-[80vw] h-full bg-white dark:bg-slate-900 border-l border-purple-200/80 dark:border-purple-900/40 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl z-10"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-lg">
                      N
                    </div>
                    <span className="font-black text-slate-900 dark:text-white">نکسورا دیجیتال</span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-colors ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-pink-500 text-white">
                            {typeof item.badge === 'number' ? toPersianDigits(item.badge) : item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="text-[11px] text-slate-400 text-center pt-4 border-t border-slate-100 dark:border-slate-800">
                نکسورا دیجیتال © ۱۴۰۵
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
