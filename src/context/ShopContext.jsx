import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, resetCsrf } from '../api/client';

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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [centerToast, setCenterToast] = useState(null);

  const showCenterMessage = (title, message, iconType = 'info') => setCenterToast({ id: Date.now(), title, message, iconType });
  const reportError = (error) => showCenterMessage('خطا', error.message, 'info');
  const refreshAccount = async () => {
    const [newCart, newWishlist] = await Promise.all([api('/account/cart'), api('/account/wishlist')]);
    setCart(newCart); setWishlist(newWishlist);
  };
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
    reloadProducts();
    api('/auth/me').then(account => { setUser(account); setIsLoggedIn(true); return refreshAccount(); }).catch(() => {});
    return () => productsRequest.current?.abort();
  }, [reloadProducts]);

  const finishAuthentication = async () => {
    resetCsrf();
    const account = await api('/auth/me');
    setUser(account);
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
  const toggleLogin = async () => {
    if (!isLoggedIn) { setIsAuthOpen(true); return; }
    try {
      await api('/auth/logout', { method: 'POST' });
      resetCsrf();
      setIsLoggedIn(false); setUser(null); setCart([]); setWishlist([]);
      showCenterMessage('خروج', 'از حساب خارج شدید.', 'user');
    } catch (error) { reportError(error); }
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
  return <ShopContext.Provider value={{ cart, wishlist, allProducts, productsStatus, reloadProducts, user, isLoggedIn, isAuthOpen, setIsAuthOpen, authenticate, authenticateGoogle, toggleLogin,
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
