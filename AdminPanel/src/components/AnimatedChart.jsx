import React, { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { toPersianDigits, formatToman, formatGoldWeight } from '../utils/formatters';

// Interactive Animated Drawing Area & Line Chart
export function AnimatedAreaChart({
  data = [],
  dataKey = 'revenue',
  xKey = 'day',
  title = 'روند فروش و درآمد',
  height = 240,
  unit = 'تومان',
  colorScheme = 'purple-pink' // 'purple-pink' | 'gold-rose' | 'violet-emerald'
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const chartId = useId().replace(/:/g, '');
  const reducedMotion = useReducedMotion();

  if (!data || data.length === 0) return null;

  const values = data.map((d) => Number(d[dataKey]) || 0);
  const minVal = Math.min(...values) * 0.9;
  const maxVal = Math.max(...values) * 1.1 || 1;

  const width = 600;
  const paddingX = 30;
  const paddingY = 25;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingY * 2;

  // Calculate coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * graphWidth;
    const norm = (d[dataKey] - minVal) / (maxVal - minVal || 1);
    const y = height - paddingY - norm * graphHeight;
    return { x, y, data: d };
  });

  // SVG Smooth Bezier Path Generator
  const generateCurvedPath = (pts) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx},${p0.y} ${cx},${p1.y} ${p1.x},${p1.y}`;
    }
    return d;
  };

  const linePath = generateCurvedPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  const gradientId = `chartGrad_${chartId}`;
  const strokeGradId = `strokeGrad_${chartId}`;

  return (
    <div className="w-full relative select-none min-w-0 overflow-hidden">
      {/* Chart Canvas */}
      <div className="w-full overflow-hidden" style={{ height: `${height}px` }}>
        <svg
          role="img"
          aria-label={title}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Area Gradient */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              {colorScheme === 'purple-pink' && (
                <>
                  <stop offset="0%" stopColor="#c026d3" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                </>
              )}
              {colorScheme === 'gold-rose' && (
                <>
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                  <stop offset="60%" stopColor="#fb7185" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity="0.0" />
                </>
              )}
            </linearGradient>

            {/* Stroke Gradient */}
            <linearGradient id={strokeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              {colorScheme === 'purple-pink' && (
                <>
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="50%" stopColor="#d946ef" />
                  <stop offset="100%" stopColor="#ec4899" />
                </>
              )}
              {colorScheme === 'gold-rose' && (
                <>
                  <stop offset="0%" stopColor="#d97706" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </>
              )}
            </linearGradient>

            {/* Glow Filter */}
            <filter id={`glow_${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#a855f7" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = paddingY + r * graphHeight;
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Animated Gradient Area Fill */}
          <motion.path
            d={areaPath}
            fill={`url(#${gradientId})`}
            initial={reducedMotion ? false : { opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `center ${height - paddingY}px` }}
          />

          {/* Animated Line Stroke Drawing Effect */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={`url(#${strokeGradId})`}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow_${gradientId})`}
            initial={reducedMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Animated Active Data Points */}
          {points.map((pt, idx) => (
            <g key={idx}>
              {/* Invisible touch/hover target */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="22"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onTouchStart={() => setHoveredIndex(idx)}
              />

              {/* Point Node */}
              <motion.circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === idx ? 6.5 : 4}
                fill="#ffffff"
                stroke={hoveredIndex === idx ? '#c026d3' : '#a855f7'}
                strokeWidth={hoveredIndex === idx ? 3.5 : 2.5}
                initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 + idx * 0.08, duration: 0.4 }}
                className="cursor-pointer transition-all duration-200"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Dynamic X-Axis Labels */}
      <div dir="ltr" className="flex justify-between px-1 sm:px-4 pt-2 text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 overflow-hidden w-full">
        {data.map((d, i) => (
          <span
            key={i}
            className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors truncate px-0.5 text-center min-w-0 flex-1"
          >
            {d[xKey]}
          </span>
        ))}
      </div>

      {/* Floating Hover Tooltip - Clamped within bounds */}
      {hoveredIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="absolute z-20 pointer-events-none bg-slate-900/95 dark:bg-slate-900/98 text-white backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl border border-purple-500/30 text-xs flex flex-col gap-0.5"
          style={{
            left: `${Math.min(85, Math.max(15, (points[hoveredIndex].x / width) * 100))}%`,
            top: `${Math.max(10, points[hoveredIndex].y - 45)}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="font-semibold text-purple-200 flex items-center justify-between gap-2">
            <span>{data[hoveredIndex][xKey]}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse"></span>
          </div>
          <div className="font-bold text-white text-xs sm:text-sm">
            {unit === 'تومان' ? formatToman(data[hoveredIndex][dataKey]) : `${toPersianDigits(data[hoveredIndex][dataKey])} ${unit}`}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Animated Gradient Donut/Radial Share Chart
export function AnimatedDonutChart({ data = [], title = 'توزیع فروش بر اساس دسته‌بندی' }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1;

  const size = 180;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full min-w-0 overflow-hidden">
      {/* Donut SVG with Drawing Segment Animations */}
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center flex-shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth={strokeWidth}
          />

          {data.map((item, idx) => {
            const percent = (item.value / total) * 100;
            const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
            accumulatedPercent += percent;

            const isHovered = activeIdx === idx;

            return (
              <motion.circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.4, delay: idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-full">
            {activeIdx !== null ? data[activeIdx].name.split('(')[0] : 'کل دسته‌ها'}
          </span>
          <span className="text-base sm:text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">
            {activeIdx !== null ? `${toPersianDigits(data[activeIdx].value)}٪` : `${toPersianDigits(total)}٪`}
          </span>
        </div>
      </div>

      {/* Legend with Interactive Hover */}
      <div className="flex flex-col gap-2 w-full min-w-0 flex-1">
        {data.map((item, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
            className={`flex items-center justify-between p-1.5 px-2 rounded-xl transition-all cursor-pointer min-w-0 ${
              activeIdx === idx ? 'bg-purple-50 dark:bg-purple-950/40 translate-x-0.5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 truncate min-w-0">{item.name}</span>
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white tabular-nums flex-shrink-0 mr-1">
              {toPersianDigits(item.value)}٪
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Animated Bar Chart
export function AnimatedBarChart({ data = [], height = 180 }) {
  const maxGrams = Math.max(...data.map((d) => d.goldGrams)) || 1;

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div className="flex items-end justify-between gap-1.5 sm:gap-4 md:gap-6 px-1 sm:px-4 md:px-8 w-full min-w-0" style={{ height: `${height}px` }}>
        {data.map((d, i) => {
          const heightPercent = (d.goldGrams / maxGrams) * 100;
          const approxGrams = Math.round(d.goldGrams);
          return (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative min-w-0">
              {/* Tooltip on hover with approximate and precise weight */}
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-950/95 dark:bg-slate-900/95 text-white text-[10px] sm:text-[11px] px-2.5 py-1 rounded-xl whitespace-nowrap shadow-xl border border-purple-500/30 pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 backdrop-blur-md">
                <span className="font-bold text-amber-400">تقریباً {toPersianDigits(approxGrams)} گرم</span>
                <span className="text-slate-400 text-[9px]">({formatGoldWeight(d.goldGrams)})</span>
              </div>

              {/* Slender Gradient Bar with Staggered Entrance (capped max-width for tablet & desktop) */}
              <motion.div
                initial={{ height: 0, scaleY: 0 }}
                animate={{ height: `${Math.max(12, heightPercent)}%`, scaleY: 1 }}
                transition={{ duration: 1.1, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: 'bottom center' }}
                className="w-full max-w-[28px] sm:max-w-[32px] md:max-w-[36px] lg:max-w-[40px] rounded-t-md sm:rounded-t-lg bg-gradient-to-t from-purple-600 via-fuchsia-500 to-pink-400 group-hover:from-purple-500 group-hover:to-pink-300 transition-all shadow-md shadow-purple-500/20 group-hover:shadow-purple-500/40"
              />

              {/* Day Label */}
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 truncate text-center w-full block group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
