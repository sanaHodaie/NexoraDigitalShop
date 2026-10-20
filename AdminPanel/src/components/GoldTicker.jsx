import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, RefreshCw, Zap } from 'lucide-react';
import { toPersianDigits, formatToman, formatPercent } from '../utils/formatters';
import { playTactileClick } from '../utils/sound';

export default function GoldTicker({ rates = [], onRefresh, isRefreshing, onSelectRate }) {
  return (
    <div className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-purple-100/60 dark:border-purple-900/30 px-4 py-2 flex items-center justify-between gap-4 overflow-hidden z-10">
      {/* Live Market Pulse Indicator */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden sm:inline-flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          مظنه زنده بازار:
        </span>
      </div>

      {/* Horizontal Scrolling Rate Chips */}
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-0.5">
        {rates.filter(r => r.isPrimary).map((rate) => {
          const isUp = rate.change >= 0;
          return (
            <motion.div
              key={rate.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playTactileClick();
                if (onSelectRate) onSelectRate(rate);
              }}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-50/80 to-pink-50/50 dark:from-slate-800/80 dark:to-purple-950/40 border border-purple-100 dark:border-purple-900/40 text-xs flex-shrink-0 cursor-pointer shadow-xs hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {rate.name.split('(')[0]}
              </span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {rate.category === 'global' ? `$${toPersianDigits(rate.price)}` : formatToman(rate.price)}
              </span>
              <span
                className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                  isUp
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/50'
                    : 'text-rose-700 dark:text-rose-400 bg-rose-100/70 dark:bg-rose-950/50'
                }`}
              >
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatPercent(rate.change)}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Manual Refresh Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          playTactileClick();
          if (onRefresh) onRefresh();
        }}
        title="بروزرسانی زنده مظنه"
        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 transition-colors flex-shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="hidden md:inline">بروزرسانی</span>
      </motion.button>
    </div>
  );
}
