import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Sparkles,
  DollarSign,
  Scale,
  Gem,
  Award,
  Layers
} from 'lucide-react';
import { toPersianDigits, formatToman, formatGoldWeight, formatPercent } from '../utils/formatters';
import { playTactileClick } from '../utils/sound';
import { AnimatedAreaChart, AnimatedDonutChart, AnimatedBarChart } from './AnimatedChart';
import AnimatedCounter from './AnimatedCounter';
import { CHART_REVENUE_DATA, CHART_CATEGORY_SHARE } from '../data/mockData';

export default function Analytics() {
  const [activeTimeframe, setActiveTimeframe] = useState('month'); // week | month | year

  const timeframeAnalytics = {
    week: {
      kpi: {
        revenue: 645000000,
        goldGrams: 172.8,
        mesghal: 37.5,
        profit: 81500000,
        growth: '۱۸.۲٪ رشد هفتگی',
        margin: '۱۲.۶٪'
      },
      trend: [
        { day: 'شنبه', revenue: 82000000, goldGrams: 22.0, profit: 10400000 },
        { day: 'یکشنبه', revenue: 95000000, goldGrams: 25.5, profit: 12100000 },
        { day: 'دوشنبه', revenue: 88000000, goldGrams: 23.6, profit: 11200000 },
        { day: 'سه‌شنبه', revenue: 112000000, goldGrams: 30.0, profit: 14200000 },
        { day: 'چهارشنبه', revenue: 128000000, goldGrams: 34.3, profit: 16100000 },
        { day: 'پنج‌شنبه', revenue: 140000000, goldGrams: 37.4, profit: 17500000 }
      ],
      barData: [
        { day: 'شنبه', goldGrams: 22.0, revenue: 82000000 },
        { day: 'یکشنبه', goldGrams: 25.5, revenue: 95000000 },
        { day: 'دوشنبه', goldGrams: 23.6, revenue: 88000000 },
        { day: 'سه‌شنبه', goldGrams: 30.0, revenue: 112000000 },
        { day: 'چهارشنبه', goldGrams: 34.3, revenue: 128000000 },
        { day: 'پنج‌شنبه', goldGrams: 37.4, revenue: 140000000 }
      ],
      ojratDistribution: [
        { name: 'کم‌اجرت / سرمایه‌گذاری (زیر ۵٪)', value: 28, color: '#eab308' },
        { name: 'اجرت متوسط کارگاهی (۱۰ تا ۱۵٪)', value: 42, color: '#a855f7' },
        { name: 'لوکس و تراش فیوژن (۱۵ تا ۲۰٪)', value: 21, color: '#ec4899' },
        { name: 'جواهرات تک‌ساز و برلیان (بالای ۲۰٪)', value: 9, color: '#f43f5e' }
      ]
    },
    month: {
      kpi: {
        revenue: 2740000000,
        goldGrams: 740.7,
        mesghal: 160.7,
        profit: 341000000,
        growth: '۲۴.۵٪ رشد ماهانه',
        margin: '۱۲.۴٪'
      },
      trend: [
        { day: 'فروردین', revenue: 380000000, goldGrams: 102.5, profit: 48000000 },
        { day: 'اردیبهشت', revenue: 490000000, goldGrams: 132.0, profit: 62000000 },
        { day: 'خرداد', revenue: 540000000, goldGrams: 145.4, profit: 69000000 },
        { day: 'تیر', revenue: 620000000, goldGrams: 168.2, profit: 79000000 },
        { day: 'مرداد (جاری)', revenue: 710000000, goldGrams: 192.6, profit: 91000000 }
      ],
      barData: CHART_REVENUE_DATA,
      ojratDistribution: [
        { name: 'کم‌اجرت / سرمایه‌گذاری (زیر ۵٪)', value: 22, color: '#eab308' },
        { name: 'اجرت متوسط کارگاهی (۱۰ تا ۱۵٪)', value: 45, color: '#a855f7' },
        { name: 'لوکس و تراش فیوژن (۱۵ تا ۲۰٪)', value: 24, color: '#ec4899' },
        { name: 'جواهرات تک‌ساز و برلیان (بالای ۲۰٪)', value: 9, color: '#f43f5e' }
      ]
    },
    year: {
      kpi: {
        revenue: 18450000000,
        goldGrams: 5120.0,
        mesghal: 1111.0,
        profit: 2280000000,
        growth: '۳۱.۸٪ رشد سالانه',
        margin: '۱۲.۳٪'
      },
      trend: [
        { day: 'بهار ۱۴۰۴', revenue: 3600000000, goldGrams: 1010.0, profit: 440000000 },
        { day: 'تابستان ۱۴۰۴', revenue: 4200000000, goldGrams: 1180.0, profit: 515000000 },
        { day: 'پاییز ۱۴۰۴', revenue: 4900000000, goldGrams: 1360.0, profit: 605000000 },
        { day: 'زمستان ۱۴۰۴', revenue: 5750000000, goldGrams: 1570.0, profit: 720000000 }
      ],
      barData: [
        { day: 'بهار', goldGrams: 1010.0, revenue: 3600000000 },
        { day: 'تابستان', goldGrams: 1180.0, revenue: 4200000000 },
        { day: 'پاییز', goldGrams: 1360.0, revenue: 4900000000 },
        { day: 'زمستان', goldGrams: 1570.0, revenue: 5750000000 }
      ],
      ojratDistribution: [
        { name: 'کم‌اجرت / سرمایه‌گذاری (زیر ۵٪)', value: 30, color: '#eab308' },
        { name: 'اجرت متوسط کارگاهی (۱۰ تا ۱۵٪)', value: 40, color: '#a855f7' },
        { name: 'لوکس و تراش فیوژن (۱۵ تا ۲۰٪)', value: 20, color: '#ec4899' },
        { name: 'جواهرات تک‌ساز و برلیان (بالای ۲۰٪)', value: 10, color: '#f43f5e' }
      ]
    }
  };

  const currentData = timeframeAnalytics[activeTimeframe] || timeframeAnalytics.month;

  return (
    <div className="space-y-6 pb-12 w-full max-w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20 flex-shrink-0">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              گزارشات و نمودارهای تحلیلی طلا
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            تحلیل هوشمند گردش وزنی طلا، درآمد ناخالص، تفکیک اجرت ساخت و مقایسه دوره‌ای
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs self-start sm:self-auto">
          {[
            { id: 'week', label: 'هفتگی' },
            { id: 'month', label: 'ماهانه' },
            { id: 'year', label: 'سالانه' }
          ].map((tf) => (
            <button
              key={tf.id}
              onClick={() => {
                playTactileClick();
                setActiveTimeframe(tf.id);
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTimeframe === tf.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Highlight Strip with Animated Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          key={`kpi_rev_${activeTimeframe}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ y: -4 }}
          className="glass-panel rounded-3xl p-4 sm:p-5 border border-purple-200/80 dark:border-purple-900/40 relative overflow-hidden min-w-0"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              کل گردش مالی دوره ({activeTimeframe === 'week' ? 'هفتگی' : activeTimeframe === 'month' ? 'ماهانه' : 'سالانه'})
            </span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tabular-nums truncate">
            <AnimatedCounter key={`cnt_rev_${activeTimeframe}`} value={currentData.kpi.revenue} suffix=" تومان" />
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {currentData.kpi.growth}
          </span>
        </motion.div>

        <motion.div
          key={`kpi_gold_${activeTimeframe}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          whileHover={{ y: -4 }}
          className="glass-panel rounded-3xl p-4 sm:p-5 border border-purple-200/80 dark:border-purple-900/40 relative overflow-hidden min-w-0"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              مجموع طلای فروخته شده
            </span>
            <span className="p-2 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tabular-nums truncate">
            <AnimatedCounter key={`cnt_gold_${activeTimeframe}`} value={currentData.kpi.goldGrams} decimals={1} suffix=" گرم" />
          </div>
          <span className="text-purple-600 dark:text-pink-400 font-bold text-xs">
            معادل {toPersianDigits(currentData.kpi.mesghal)} مثقال طلا
          </span>
        </motion.div>

        <motion.div
          key={`kpi_profit_${activeTimeframe}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -4 }}
          className="glass-panel rounded-3xl p-4 sm:p-5 border border-purple-200/80 dark:border-purple-900/40 relative overflow-hidden min-w-0"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              سود ناخالص و اجرت کسب شده
            </span>
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tabular-nums truncate">
            <AnimatedCounter key={`cnt_profit_${activeTimeframe}`} value={currentData.kpi.profit} suffix=" تومان" />
          </div>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            حاشیه سود: {currentData.kpi.margin}
          </span>
        </motion.div>
      </div>

      {/* Main Animated Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        {/* Drawing Trend Line & Area Chart */}
        <div className="lg:col-span-8 glass-panel rounded-3xl p-4 sm:p-6 border border-purple-100 dark:border-purple-900/30 space-y-4 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                روند درآمد ({activeTimeframe === 'week' ? 'هفتگی' : activeTimeframe === 'month' ? 'ماهانه' : 'سالانه'})
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                ترسیم پیوسته گرادیان ارغوانی و صورتی گالری لوکس ژوئل
              </p>
            </div>
          </div>

          <AnimatedAreaChart
            key={`chart_area_${activeTimeframe}`}
            data={currentData.trend}
            dataKey="revenue"
            xKey="day"
            height={220}
            unit="تومان"
            colorScheme="purple-pink"
          />
        </div>

        {/* Ojrat Breakdown Donut */}
        <div className="lg:col-span-4 glass-panel rounded-3xl p-4 sm:p-6 border border-purple-100 dark:border-purple-900/30 flex flex-col justify-between min-w-0 overflow-hidden space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
              تفکیک سطح اجرت ساخت
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              توزیع مدل‌های کم‌اجرت در برابر لوکس
            </p>
          </div>

          <AnimatedDonutChart key={`chart_donut_${activeTimeframe}`} data={currentData.ojratDistribution} />

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            بیشترین فروش مربوط به اجرت کارگاهی (۱۰ الی ۱۵ درصد) است.
          </div>
        </div>
      </div>

      {/* Gold Gram Turnover Bar Chart */}
      <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-purple-100 dark:border-purple-900/30 space-y-4 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
              حجم طلای تحویل شده دوره (بر حسب گرم)
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              میله‌های ستونی ظریف گرادیان با ورود تدریجی و انیمیشن مقیاس
            </p>
          </div>
        </div>

        <AnimatedBarChart key={`chart_bar_${activeTimeframe}`} data={currentData.barData} height={180} />
      </div>
    </div>
  );
}
