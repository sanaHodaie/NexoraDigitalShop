import React, { lazy, Suspense, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { ShopProvider, useShop } from './context/ShopContext';
import { Navbar } from './components/Header/Navbar';
import { Footer } from './components/Footer/Footer';
import { CartDrawer } from './components/Modals/CartDrawer';
import { WishlistModal } from './components/Modals/WishlistModal';
import { QuickViewModal } from './components/Modals/QuickViewModal';
import { ToastContainer } from './components/Modals/ToastContainer';
import { usePathname } from './navigation';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';

const HomePage = lazy(() => import('./pages/HomePage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const AuthModal = lazy(() => import('./components/Auth/AuthModal').then(module => ({ default: module.AuthModal })));

function Storefront() {
  const pathname = usePathname();
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
    else document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [pathname, hash]);
  const account = pathname === '/account' || pathname === '/account/';
  const recovery = pathname === '/reset-password' || pathname === '/reset-password/';
  const verification = ['/verify-email', '/confirm-email-change'].includes(pathname.replace(/\/$/, ''));
  const { isAuthOpen } = useShop();
  useEffect(() => {
    if (!account && !recovery && !verification) return;
    const title = document.title;
    const robots = document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    document.title = recovery ? 'بازیابی رمز عبور | نکسورا' : 'حساب کاربری | نکسورا';
    return () => { robots.remove(); document.title = title; };
  }, [account, recovery, verification]);
  return <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-300 font-vazir selection:bg-blue-600 selection:text-white">
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:bg-white focus:p-3">رفتن به محتوای اصلی</a>
    <Navbar />
    <main id="main-content" className="flex-1 min-w-0">
      <Suspense fallback={<div role="status" className="min-h-[65vh] grid place-items-center text-slate-500">در حال آماده‌سازی صفحه…</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:categoryId" element={<CategoryPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/confirm-email-change" element={<VerifyEmailPage />} />
          <Route path="*" element={<section dir="rtl" className="mx-auto max-w-7xl px-6 py-24 text-center"><h1 className="text-2xl font-bold">صفحه پیدا نشد</h1><Link to="/" className="mt-6 inline-block text-blue-600 dark:text-blue-400">بازگشت به خانه</Link></section>} />
        </Routes>
      </Suspense>
    </main>
    <Footer />
    <CartDrawer /><WishlistModal /><QuickViewModal /><ToastContainer />
    {isAuthOpen && <Suspense fallback={<div role="status" className="fixed bottom-6 inset-x-4 z-50 rounded-2xl bg-white dark:bg-slate-900 p-4 text-center shadow-xl">در حال باز کردن فرم ورود…</div>}><AuthModal /></Suspense>}
  </div>;
}

export default function App() {
  return <BrowserRouter><ThemeProvider><ShopProvider><Storefront /></ShopProvider></ThemeProvider></BrowserRouter>;
}
