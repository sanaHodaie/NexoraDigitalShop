import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag, Info, UserCheck, X } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { CloseIcon } from '../../assets/icons/CloseIcon';

export const ToastContainer = () => {
  const { centerToast, closeCenterMessage } = useShop();

  if (!centerToast) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
        {/* Soft backdrop blur for focus */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] pointer-events-auto"
          onClick={closeCenterMessage}
        />

        {/* Center Toast Card with Blue Harmony (هارمونی آبی جذاب و زیبا) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative pointer-events-auto max-w-sm w-full rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-blue-500/30 shadow-2xl shadow-blue-500/20 p-5 text-right overflow-hidden"
        >
          {/* Subtle blue accent background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={closeCenterMessage}
            className="absolute top-3.5 left-3.5 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer p-1"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-3.5 pt-1">
            {/* Blue-themed icon box */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
              {centerToast.iconType === 'heart' && (
                <Heart className="w-6 h-6 fill-white text-white animate-bounce" />
              )}
              {centerToast.iconType === 'cart' && (
                <ShoppingBag className="w-6 h-6 text-white" />
              )}
              {centerToast.iconType === 'user' && (
                <UserCheck className="w-6 h-6 text-white" />
              )}
              {centerToast.iconType === 'info' && (
                <Info className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="flex-1 pr-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {centerToast.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {centerToast.message}
              </p>
            </div>
          </div>

          {/* Blue progress bar auto-closing indicator */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 3.5, ease: 'linear' }}
            onAnimationComplete={closeCenterMessage}
            className="h-1 bg-gradient-to-l from-blue-600 to-sky-400 rounded-full mt-4"
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
