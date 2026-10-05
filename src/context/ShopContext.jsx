import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, resetCsrf } from '../api/client';
import { navigate, usePathname } from '../navigation';

const ShopContext = createContext();
const RIAL_RATE = 600000;
export const ShopProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [productsStatus, setProductsStatus] = useState('loading');
  const productsRequest = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const [accountStatus, setAccountStatus] = useState('loading');
  const accountEpoch = useRef(0);
  const sessionBootstrap = useRef(null);
  const pathname = usePathname();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [centerToast, setCenterToast] = useState(null);

  const showCenterMessage = (title, message, iconType = 'info') => setCenterToast({ id: Date.now(), title, message, iconType });
  const reportError = (error) => showCenterMessage('خطا', error.message, 'info');
  const refreshAccount = useCallback(async () => {
    const epoch = ++accountEpoch.current;
    setAccountStatus('loading');
    try {
      const [newCart, newWishlist] = await Promise.all([api('/account/cart'), api('/account/wishlist')]);
      if (!Array.isArray(newCart) || !Array.isArray(newWishlist)) throw new Error('Invalid account response');
      if (epoch !== accountEpoch.current) return;
      setCart(newCart); setWishlist(newWishlist); setAccountStatus('ready');
    } catch (error) {
      if (epoch === accountEpoch.current) setAccountStatus('error');
      throw error;
    }
  }, []);
  const reloadProducts = useCallback(async () => {
    productsRequest.current?.abort();
    const controller = new AbortController();
    productsRequest.current = controller;
    setProductsStatus('loading');
    try {
      const products = await api('/products', { signal: controller.signal });
      if (!Array.isArray(products)) throw new Error('Invalid product response');
      if (controller.signal.aborted) return;
      setAllProducts(products);
      setProductsStatus('ready');
    } catch {
      // Initial background loading must not open a blocking global error modal.
      // Keep the failure visible beside the catalogue, where it can be retried.
      if (!controller.signal.aborted) setProductsStatus('error');
    }
  }, []);
  useEffect(() => {
    if (!pathname.startsWith('/account') && !pathname.startsWith('/reset-password')) reloadProducts();
    return () => productsRequest.current?.abort();
  }, [reloadProducts, pathname]);
  useEffect(() => {
    const controller = new AbortController();
    sessionBootstrap.current = controller;
    api('/auth/me', { signal: controller.signal }).then(account => {
      if (controller.signal.aborted) return;
      setUser(account); setIsLoggedIn(true); setAuthStatus('ready');
      refreshAccount().catch(() => {});
    }).catch(error => { if (!controller.signal.aborted) setAuthStatus(error.status === 401 ? 'guest' : 'error'); });
    return () => { controller.abort(); accountEpoch.current++; };
  }, [refreshAccount]);
  useEffect(() => {
    const expired = () => {
      sessionBootstrap.current?.abort(); accountEpoch.current++;
      setUser(null); setIsLoggedIn(false); setAuthStatus('guest');
      setCart([]); setWishlist([]); setAccountStatus('loading');
      setIsCartOpen(false); setIsWishlistModalOpen(false);
    };
    window.addEventListener('nexora:session-expired', expired);
    return () => window.removeEventListener('nexora:session-expired', expired);
  }, []);

  const finishAuthentication = async () => {
    sessionBootstrap.current?.abort();
    resetCsrf();
    const account = await api('/auth/me');
    setUser(account);
    setAuthStatus('ready');
    setIsLoggedIn(true); setIsAuthOpen(false);
    await refreshAccount().catch(reportError);
    showCenterMessage('ورود موفق', account.fullName ? `${account.fullName}، به نکسورا خوش آمدی.` : 'به حساب خود وارد شدید.', 'user');
  };
  const authenticate = async (email, password, register, fullName) => {
    await api(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify({ email, password, ...(register ? { fullName } : {}) }) });
    await finishAuthentication();
  };
  const authenticateGoogle = async credential => {
    await api('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
    await finishAuthentication();
  };
  const toggleLogin = () => {
    if (!isLoggedIn) { setIsAuthOpen(true); return; }
    navigate('/account');
  };
  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
      resetCsrf();
      sessionBootstrap.current?.abort();
      accountEpoch.current++;
      setAuthStatus('guest'); setAccountStatus('loading');
      setIsLoggedIn(false); setUser(null); setCart([]); setWishlist([]);
      setIsCartOpen(false); setIsWishlistModalOpen(false);
      navigate('/');
      showCenterMessage('خروج', 'از حساب خارج شدید.', 'user');
    } catch (error) { reportError(error); throw error; }
  };
  const requireLogin = () => { if (!isLoggedIn) { setIsAuthOpen(true); return false; } return true; };
  const addToCart = async (product, quantity = 1) => {
    if (!requireLogin()) return;
    try {
      const existing = cart.find(x => x.product.id === product.id);
      await api(`/account/cart/${encodeURIComponent(product.id)}`, { method: 'PUT', body: JSON.stringify({ quantity: (existing?.quantity || 0) + quantity }) });
      await refreshAccount(); showCenterMessage('به سبد خرید اضافه شد', `«${product.name}» به سبد اضافه شد.`, 'cart');
    } catch (error) { reportError(error); }
  };
  const updateQuantity = async (productId, quantity) => {
    try { await api(`/account/cart/${encodeURIComponent(productId)}`, { method: 'PUT', body: JSON.stringify({ quantity }) }); await refreshAccount(); }
    catch (error) { reportError(error); }
  };
  const removeFromCart = (id) => updateQuantity(id, 0);
  const clearCart = async () => { try { await api('/account/cart', { method: 'DELETE' }); setCart([]); } catch (error) { reportError(error); } };
  const toggleWishlist = async (product) => {
    if (!requireLogin()) return;
    try {
      const exists = wishlist.some(x => x.id === product.id);
      await api(`/account/wishlist/${encodeURIComponent(product.id)}`, { method: exists ? 'DELETE' : 'PUT' });
      await refreshAccount(); showCenterMessage(exists ? 'حذف از علاقه‌مندی‌ها' : 'به علاقه‌مندی‌ها اضافه شد', product.name, 'heart');
    } catch (error) { reportError(error); }
  };
  const toPersianDigits = num => String(num ?? '').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
  const formatPrice = amount => `${toPersianDigits(Math.round((amount || 0) * RIAL_RATE).toLocaleString('en-US'))} ریال`;
  return <ShopContext.Provider value={{ cart, wishlist, allProducts, productsStatus, reloadProducts, user, setUser, authStatus, accountStatus, refreshAccount, logout, isLoggedIn, isAuthOpen, setIsAuthOpen, authenticate, authenticateGoogle, toggleLogin,
    addToCart, removeFromCart, updateQuantity, clearCart, toggleWishlist, isInWishlist: id => wishlist.some(x => x.id === id),
    totalCartCount: cart.reduce((sum, x) => sum + x.quantity, 0), totalWishlistCount: wishlist.length,
    cartSubtotal: cart.reduce((sum, x) => sum + x.product.price * x.quantity, 0),
    isCartOpen, setIsCartOpen, isWishlistModalOpen, setIsWishlistModalOpen, quickViewProduct, setQuickViewProduct,
    searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, centerToast, closeCenterMessage: () => setCenterToast(null),
    showCenterMessage, addToast: message => showCenterMessage('خبرنامه', message), formatPrice, toPersianDigits }}>
    {children}
  </ShopContext.Provider>;
};
export const useShop = () => { const value = useContext(ShopContext); if (!value) throw new Error('ShopProvider missing'); return value; };
