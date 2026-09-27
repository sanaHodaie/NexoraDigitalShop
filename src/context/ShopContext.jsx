import React, { createContext, useContext, useState } from 'react';
import { TRENDING_PRODUCTS, FLASH_DEALS, RECOMMENDED_PRODUCTS } from '../data/mockData';

const ShopContext = createContext();

// 1 USD = approx 600,000 Rials for realistic tech pricing conversion
const RIAL_RATE = 600000;

export const ShopProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [centerToast, setCenterToast] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const allProducts = [...TRENDING_PRODUCTS, ...FLASH_DEALS, ...RECOMMENDED_PRODUCTS];

  // Persian numbers converter
  const toPersianDigits = (num) => {
    if (num === null || num === undefined) return '';
    const str = String(num);
    const persianMap = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.replace(/\d/g, (d) => persianMap[d]);
  };

  // Convert and format all prices in Rial (ریال)
  const formatPrice = (amountInUsd) => {
    if (!amountInUsd) return '۰ ریال';
    const rialAmount = Math.round(amountInUsd * RIAL_RATE);
    return `${toPersianDigits(rialAmount.toLocaleString('en-US'))} ریال`;
  };

  const showCenterMessage = (title, message, iconType = 'heart') => {
    setCenterToast({ id: Date.now(), title, message, iconType });
  };

  const closeCenterMessage = () => {
    setCenterToast(null);
  };

  const toggleLogin = () => {
    setIsLoggedIn((prev) => {
      const next = !prev;
      showCenterMessage(
        next ? 'ورود موفقیت‌آمیز' : 'خروج از حساب',
        next ? 'شما با موفقیت به حساب کاربری نکسورا وارد شدید.' : 'شما از حساب کاربری خارج شدید.',
        'user'
      );
      return next;
    });
  };

  const addToCart = (product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    showCenterMessage(
      'به سبد خرید اضافه شد',
      `«${product.name}» با موفقیت در سبد خرید شما قرار گرفت.`,
      'cart'
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Toggle wishlist with elegant blue-themed center toast notification
  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        showCenterMessage(
          'حذف از علاقه‌مندی‌ها',
          `«${product.name}» از لیست نشان‌شده‌های شما برداشته شد.`,
          'info'
        );
        return prev.filter((item) => item.id !== product.id);
      } else {
        showCenterMessage(
          'به علاقه‌مندی‌ها اضافه شد',
          `«${product.name}» با موفقیت به لیست نشان‌شده‌های شما پیوست.`,
          'heart'
        );
        return [...prev, product];
      }
    });
  };

  const isInWishlist = (productId) => wishlist.some((item) => item.id === productId);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalWishlistCount = wishlist.length;

  const cartSubtotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  return (
    <ShopContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        wishlist,
        totalWishlistCount,
        toggleWishlist,
        isInWishlist,
        isWishlistModalOpen,
        setIsWishlistModalOpen,
        quickViewProduct,
        setQuickViewProduct,
        searchQuery,
        setSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        centerToast,
        closeCenterMessage,
        formatPrice,
        toPersianDigits,
        isLoggedIn,
        toggleLogin,
        allProducts,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
