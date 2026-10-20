import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Calculator,
  Flame,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  CircleDollarSign,
  Zap,
  Info,
  Scale,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toPersianDigits, formatToman, formatPercent, formatGoldWeight, getTodayJalali } from '../utils/formatters';
import { playTactileClick, playSuccessChime } from '../utils/sound';
import { AnimatedAreaChart } from './AnimatedChart';
import AnimatedCounter from './AnimatedCounter';

export default function GoldPrices({ rates, onUpdateRates, onNavigate }) {
  const [activeCategory, setActiveCategory] = useState('all'); // all | gold | coin | bar | silver | global
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [isSimulating, setIsSimulating] = useState(false);

  // Smart Gold Calculator State
  const [calcWeight, setCalcWeight] = useState(7.5); // grams
  const [calcCarat, setCalcCarat] = useState(18);
  const [calcOjratPercent, setCalcOjratPercent] = useState(14); // 14%
  const [calcProfitPercent, setCalcProfitPercent] = useState(7); // 7% legal
  const [calcTaxPercent, setCalcTaxPercent] = useState(9); // 9% on ojrat & profit
  const [calcStonePrice, setCalcStonePrice] = useState(0);

  const gold18kRate = rates.find((r) => r.id === 'gold_18k')?.price || 3685000;
  const mesghalRate = rates.find((r) => r.id === 'gold_mesghal')?.price || 15965000;

  // Exact Official Guild Calculation Formula
  // Base raw gold per gram = (gold18kRate * (carat / 18))
  const baseRawPerGram = gold18kRate * (calcCarat / 18);
  const totalRawGold = calcWeight * baseRawPerGram;
  const totalOjrat = totalRawGold * (calcOjratPercent / 100);
  const totalProfit = (totalRawGold + totalOjrat) * (calcProfitPercent / 100);
  // Value Added Tax is strictly applied only on (Ojrat + Profit) according to Iranian jewelry law
  const totalTax = (totalOjrat + totalProfit) * (calcTaxPercent / 100);
  const calculatedTotal = totalRawGold + totalOjrat + totalProfit + totalTax + Number(calcStonePrice || 0);

  // Filter rates
  const filteredRates = activeCategory === 'all'
    ? rates
    : rates.filter((r) => r.category === activeCategory);

  // Market Simulation Toggle
  const toggleMarketSimulation = () => {
    playTactileClick();
    if (!isSimulating) {
      setIsSimulating(true);
      const interval = setInterval(() => {
        onUpdateRates((prevRates) =>
          prevRates.map((item) => {
            const fluctuation = (Math.random() - 0.48) * (item.category === 'global' ? 0.8 : 4500);
            const newPrice = Math.max(1000, Math.round(item.price + fluctuation));
            const newChange = parseFloat((item.change + (Math.random() - 0.48) * 0.05).toFixed(2));
            return {
              ...item,
              price: newPrice,
              change: newChange,
              updatedAt: 'لحظه‌ای'
            };
          })
        );
      }, 2500);
      window._goldSimInterval = interval;
    } else {
      setIsSimulating(false);
      if (window._goldSimInterval) {
        clearInterval(window._goldSimInterval);
      }
    }
  };

  // Timeframe chart datasets for 24h, 7d, 30d
  const chartDatasets = {
    '24h': [
      { time: '۰۹:۰۰', price: gold18kRate - 45000 },
      { time: '۱۰:۳۰', price: gold18kRate - 27000 },
      { time: '۱۲:۰۰', price: gold18kRate - 13000 },
      { time: '۱۳:۳۰', price: gold18kRate - 16000 },
      { time: '۱۵:۰۰', price: gold18kRate - 4000 },
      { time: '۱۶:۳۰', price: gold18kRate + 4000 },
      { time: '۱۸:۰۰', price: gold18kRate }
    ],
    '7d': [
      { time: 'شنبه', price: gold18kRate - 110000 },
      { time: 'یکشنبه', price: gold18kRate - 85000 },
      { time: 'دوشنبه', price: gold18kRate - 60000 },
      { time: 'سه‌شنبه', price: gold18kRate - 40000 },
      { time: 'چهارشنبه', price: gold18kRate - 15000 },
      { time: 'پنج‌شنبه', price: gold18kRate + 12000 },
      { time: 'امروز', price: gold18kRate }
    ],
    '30d': [
      { time: '۱ مرداد', price: gold18kRate - 280000 },
      { time: '۶ مرداد', price: gold18kRate - 220000 },
      { time: '۱۲ مرداد', price: gold18kRate - 175000 },
      { time: '۱۸ مرداد', price: gold18kRate - 110000 },
      { time: '۲۴ مرداد', price: gold18kRate - 65000 },
      { time: '۲۸ مرداد', price: gold18kRate - 20000 },
      { time: 'امروز', price: gold18kRate }
    ]
  };

  const chartData = chartDatasets[selectedTimeframe] || chartDatasets['24h'];

  return (
    <div className="space-y-6 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 text-white shadow-lg shadow-purple-500/20">
              <Coins className="w-5 h-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              تابلو نرخ لحظه‌ای طلا، شمش و نقره
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            پایش لحظه‌ای مظنه بازار تهران، مسکوکات بانکی، شمش‌های بین‌المللی و حباب قیمت
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleMarketSimulation}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md ${
              isSimulating
                ? 'bg-amber-500 text-white shadow-amber-500/30 animate-pulse'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-purple-300'
            }`}
          >
            <Zap className={`w-4 h-4 ${isSimulating ? 'text-white fill-white' : 'text-amber-500'}`} />
            {isSimulating ? 'شبیه‌ساز زنده نوسان بازار (فعال)' : 'فعال‌سازی نوسان زنده بازار'}
          </motion.button>
        </div>
      </div>

      {/* Quick Summary Glass Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 18k Gold Primary Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-panel rounded-3xl p-5 relative overflow-hidden group border border-purple-200/80 dark:border-purple-900/40"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-amber-400/20 via-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              طلای ۱۸ عیار (هر گرم)
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-2 tabular-nums">
            <AnimatedCounter value={gold18kRate} suffix=" تومان" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              {formatPercent(rates.find((r) => r.id === 'gold_18k')?.change || 1.45)}
            </span>
            <span className="text-slate-400 text-[11px]">مبنای معاملات ویترین</span>
          </div>
        </motion.div>

        {/* Mesghal Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-panel rounded-3xl p-5 relative overflow-hidden group border border-purple-200/80 dark:border-purple-900/40"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-purple-500/20 via-pink-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              مثقال طلا (مظنه تهران)
            </span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-2 tabular-nums">
            <AnimatedCounter value={mesghalRate} suffix=" تومان" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              {formatPercent(rates.find((r) => r.id === 'gold_mesghal')?.change || 1.42)}
            </span>
            <span className="text-slate-400 text-[11px]">معادل ۴.۶۰۸ گرم</span>
          </div>
        </motion.div>

        {/* Emami Coin Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-panel rounded-3xl p-5 relative overflow-hidden group border border-purple-200/80 dark:border-purple-900/40"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-pink-500/20 via-rose-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              سکه تمام بهار (امامی)
            </span>
            <span className="p-2 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-2 tabular-nums">
            <AnimatedCounter
              value={rates.find((r) => r.id === 'coin_emami')?.price || 43850000}
              suffix=" تومان"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              {formatPercent(rates.find((r) => r.id === 'coin_emami')?.change || 0.92)}
            </span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold text-[11px]">
              حباب: {formatToman(rates.find((r) => r.id === 'coin_emami')?.bubble || 7850000)}
            </span>
          </div>
        </motion.div>

        {/* Global Gold Ounce Card */}
        <motion.div
          whileHover={{ y: -4 }}
          className="glass-panel rounded-3xl p-5 relative overflow-hidden group border border-purple-200/80 dark:border-purple-900/40"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-indigo-500/20 via-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              انس جهانی طلا (XAU)
            </span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-2 tabular-nums">
            <AnimatedCounter
              value={rates.find((r) => r.id === 'global_gold_ounce')?.price || 2435.8}
              decimals={1}
              prefix="$"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              {formatPercent(rates.find((r) => r.id === 'global_gold_ounce')?.change || 0.62)}
            </span>
            <span className="text-slate-400 text-[11px]">۳۱.۱۰۳ گرم طلای ۲۴</span>
          </div>
        </motion.div>
      </div>

      {/* Main Grid: Comprehensive Rates Table & Smart Formula Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Precious Metals & Coin Table (8 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-purple-100 dark:border-purple-900/30 space-y-5">
            {/* Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'همه نرخ‌ها' },
                  { id: 'gold', label: 'طلا و مثقال' },
                  { id: 'coin', label: 'انواع سکه' },
                  { id: 'bar', label: 'شمش خالص' },
                  { id: 'silver', label: 'نقره و پلاتین' },
                  { id: 'global', label: 'انس جهانی' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      playTactileClick();
                      setActiveCategory(tab.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeCategory === tab.id
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400 font-medium">
                {toPersianDigits(filteredRates.length)} مورد
              </span>
            </div>

            {/* Rates Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-3 pr-2">عنوان فلز / مسکوکات</th>
                    <th className="pb-3 text-left">قیمت زنده</th>
                    <th className="pb-3 text-center">نوسان ۲۴h</th>
                    <th className="pb-3 text-center">حباب / جزئیات</th>
                    <th className="pb-3 text-left pl-2">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRates.map((rate) => {
                    const isUp = rate.change >= 0;
                    return (
                      <motion.tr
                        key={rate.id}
                        whileHover={{ backgroundColor: 'rgba(168, 85, 247, 0.04)' }}
                        className="transition-colors group"
                      >
                        <td className="py-3.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-100 block">
                                {rate.name}
                              </span>
                              {rate.weight && (
                                <span className="text-[10px] text-slate-400">
                                  وزن: {formatGoldWeight(rate.weight)} | عیار: {toPersianDigits(rate.carat || 24)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 text-left font-black text-slate-900 dark:text-white tabular-nums text-sm">
                          {rate.category === 'global' ? `$${toPersianDigits(rate.price)}` : formatToman(rate.price)}
                        </td>

                        <td className="py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-lg ${
                              isUp
                                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                                : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                            }`}
                          >
                            {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {formatPercent(rate.change)}
                          </span>
                        </td>

                        <td className="py-3.5 text-center">
                          {rate.bubble ? (
                            <div className="flex flex-col items-center">
                              <span className="text-purple-600 dark:text-pink-400 font-bold text-xs">
                                {formatToman(rate.bubble)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ({toPersianDigits(rate.bubblePercent)}٪ حباب)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 text-left pl-2">
                          <span className="text-[11px] font-medium text-slate-400">
                            {rate.updatedAt}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Animated Gold Fluctuation Chart */}
          <div className="glass-panel rounded-3xl p-6 border border-purple-100 dark:border-purple-900/30 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  نمودار نوسانات لحظه‌ای طلای ۱۸ عیار
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  رسم انیمیشنی پیوسته مظنه در طول ساعات کاری بازار
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {['24h', '7d', '30d'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      playTactileClick();
                      setSelectedTimeframe(tf);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      selectedTimeframe === tf
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
                    }`}
                  >
                    {tf === '24h' ? '۲۴ ساعت' : tf === '7d' ? '۷ روز' : '۳۰ روز'}
                  </button>
                ))}
              </div>
            </div>

            <AnimatedAreaChart
              key={`gold_chart_${selectedTimeframe}`}
              data={chartData}
              dataKey="price"
              xKey="time"
              height={220}
              unit="تومان"
              colorScheme="purple-pink"
            />
          </div>
        </div>

        {/* Smart Official Gold Calculator (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-purple-200/80 dark:border-purple-900/40 space-y-5 sticky top-24 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <span className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25">
                <Calculator className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  ماشین حساب هوشمند فرمول طلا
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  محاسبه دقیق قیمت فاکتور مطابق آخرین قانون مالیات طلا
                </p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3.5 text-xs">
              {/* Weight */}
              <div>
                <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>وزن طلا:</span>
                  <span className="text-purple-600 dark:text-pink-400">{formatGoldWeight(calcWeight)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="50"
                  step="0.1"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(parseFloat(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Carat Selector */}
              <div className="grid grid-cols-3 gap-2">
                {[18, 21, 24].map((carat) => (
                  <button
                    key={carat}
                    type="button"
                    onClick={() => {
                      playTactileClick();
                      setCalcCarat(carat);
                    }}
                    className={`py-2 rounded-xl font-bold border transition-all text-xs ${
                      calcCarat === carat
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {toPersianDigits(carat)} عیار
                  </button>
                ))}
              </div>

              {/* Ojrat % */}
              <div>
                <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>اجرت ساخت کارگاه:</span>
                  <span className="text-purple-600 dark:text-pink-400">{toPersianDigits(calcOjratPercent)}٪</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="35"
                  step="1"
                  value={calcOjratPercent}
                  onChange={(e) => setCalcOjratPercent(parseFloat(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Profit & Tax display */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[10px] block">سود قانونی مصوب:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{toPersianDigits(calcProfitPercent)}٪ قانونی</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[10px] block">مالیات بر ارزش افزوده:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{toPersianDigits(calcTaxPercent)}٪ (فقط اجرت و سود)</span>
                </div>
              </div>

              {/* Stone Price Optional */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  ارزش سنگ / الماس (اختیاری):
                </label>
                <input
                  type="number"
                  step="500000"
                  value={calcStonePrice}
                  onChange={(e) => setCalcStonePrice(parseFloat(e.target.value) || 0)}
                  placeholder="۰ تومان"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Formula Step-by-Step Breakdown */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/80 to-pink-50/50 dark:from-slate-800/80 dark:to-purple-950/40 border border-purple-100 dark:border-purple-900/40 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>ارزش طلای خام:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatToman(totalRawGold)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>اجرت ساخت:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatToman(totalOjrat)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>سود فروشنده (۷٪):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatToman(totalProfit)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>مالیات ۹٪ (اجرت + سود):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatToman(totalTax)}</span>
              </div>

              <div className="pt-3 border-t border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">مبلغ کل پرداختی خریدار:</span>
                <span className="font-black text-base text-purple-700 dark:text-pink-400 tabular-nums">
                  {formatToman(calculatedTotal)}
                </span>
              </div>
            </div>

            {/* Quick Action */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                playSuccessChime();
                if (onNavigate) onNavigate('products');
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              افزودن این مشخصات به عنوان محصول ویترین
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
