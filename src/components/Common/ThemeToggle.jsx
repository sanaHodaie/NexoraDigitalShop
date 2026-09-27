import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
      title={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
      className={`relative inline-flex items-center gap-2 p-2 rounded-full cursor-pointer transition-colors duration-300 ${
        isDark
          ? 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-slate-700/60 shadow-inner'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-sm'
      } ${className}`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        className="w-5 h-5 flex items-center justify-center"
      >
        {isDark ? (
          <Moon className="w-4 h-4 fill-amber-300 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.4)]" />
        ) : (
          <Sun className="w-4 h-4 fill-amber-400 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]" />
        )}
      </motion.div>

      {showLabel && (
        <span className="text-xs font-medium px-1">
          {isDark ? 'حالت تاریک' : 'حالت روشن'}
        </span>
      )}
    </button>
  );
};
